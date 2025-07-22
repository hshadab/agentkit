// Workflow Manager - Handles workflow operations and UI
import { debugLog, getStepIcon, getStatusText } from './utils.js';
import { config } from './config.js';

export class WorkflowManager {
    constructor(uiManager, transferManager) {
        this.uiManager = uiManager;
        this.transferManager = transferManager;
        this.workflowPollingIntervals = new Map();
        this.workflowStates = new Map();
    }

    addWorkflowCard(data) {
        debugLog(`Adding workflow card: ${data.workflow_id}`, 'info');
        
        const workflowCard = document.createElement('div');
        workflowCard.className = 'workflow-card';
        workflowCard.setAttribute('data-workflow-id', data.workflow_id);
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <div class="card-header-row">
                <div>
                    <div class="card-function-name">Zero Knowledge Proof Workflow</div>
                    <div class="card-title">ID: ${data.workflow_id}</div>
                </div>
                <span class="status-badge executing">EXECUTING</span>
            </div>
        `;
        workflowCard.appendChild(header);
        
        // Create steps container
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'workflow-steps-container';
        stepsContainer.setAttribute('id', `workflow-steps-${data.workflow_id}`);
        
        // Add steps
        if (data.steps && data.steps.length > 0) {
            data.steps.forEach((step, index) => {
                const stepElement = this.createWorkflowStepElement(step, index, data.steps.length, data);
                stepsContainer.appendChild(stepElement);
                
                // Add connector between steps (except after last step)
                if (index < data.steps.length - 1) {
                    const connector = this.createStepConnector(step.status);
                    stepsContainer.appendChild(connector);
                }
            });
        }
        
        workflowCard.appendChild(stepsContainer);
        
        // Store workflow state
        this.workflowStates.set(data.workflow_id, data);
        
        // Start polling for updates if workflow is active
        if (data.status === 'active' || data.status === 'executing') {
            this.startWorkflowPolling(data.workflow_id);
        }
        
        return workflowCard;
    }

    createWorkflowStepElement(step, index, totalSteps, workflowData) {
        const stepDiv = document.createElement('div');
        stepDiv.className = `workflow-step ${step.status || 'pending'}`;
        stepDiv.setAttribute('data-workflow-id', workflowData.workflow_id);
        stepDiv.setAttribute('data-step-id', step.id);
        stepDiv.setAttribute('data-step-index', index);
        
        // Create step header
        const stepHeader = document.createElement('div');
        stepHeader.className = 'workflow-step-header';
        
        // Step details
        const stepDetails = document.createElement('div');
        stepDetails.className = 'step-details';
        stepDetails.innerHTML = `
            <div class="step-title">STEP ${index + 1} OF ${totalSteps}</div>
            <div class="step-description">${getStepIcon(step)} ${step.description}</div>
            ${step.startTime ? `<div class="step-timing">Started: ${new Date(step.startTime).toLocaleTimeString()}</div>` : ''}
        `;
        
        // Step status
        const stepStatus = document.createElement('div');
        stepStatus.className = 'step-status';
        stepStatus.textContent = getStatusText(step.status || 'pending');
        
        stepHeader.appendChild(stepDetails);
        stepHeader.appendChild(stepStatus);
        stepDiv.appendChild(stepHeader);
        
        // Add step content if exists (for transfers)
        if (step.type === 'transfer' && step.transferData) {
            const stepContent = document.createElement('div');
            stepContent.className = 'step-content';
            stepContent.appendChild(this.transferManager.createTransferStatusElement(step.transferData));
            stepDiv.appendChild(stepContent);
        }
        
        // Add step content if exists (for verifications)
        if ((step.type === 'verify_on_blockchain' || step.action === 'verify_on_ethereum' || 
             step.action === 'verify_on_solana' || step.action === 'verify_on_base') && 
            step.verificationData) {
            const stepContent = document.createElement('div');
            stepContent.className = 'step-content';
            stepContent.appendChild(this.createVerificationStatusElement(step.verificationData));
            stepDiv.appendChild(stepContent);
        }
        
        return stepDiv;
    }

    createStepConnector(status = 'pending') {
        const connector = document.createElement('div');
        connector.className = `step-connector ${status}`;
        connector.innerHTML = '<div class="connector-line"></div>';
        return connector;
    }

    updateWorkflowStep(workflowId, stepId, updates) {
        debugLog(`Updating workflow step: ${workflowId}/${stepId}`, 'info');
        debugLog(`Updates received: ${JSON.stringify(updates)}`, 'debug');
        
        const stepElement = document.querySelector(`[data-workflow-id="${workflowId}"][data-step-id="${stepId}"]`);
        if (!stepElement) {
            debugLog(`Step element not found: ${stepId}`, 'warning');
            // Try to find by step ID only
            const altElement = document.querySelector(`[data-step-id="${stepId}"]`);
            if (altElement) {
                debugLog(`Found element with step-id only, workflow-id on element: ${altElement.getAttribute('data-workflow-id')}`, 'warning');
            }
            return;
        }
        
        // Update step status
        if (updates.status) {
            stepElement.className = `workflow-step ${updates.status}`;
            const statusElement = stepElement.querySelector('.step-status');
            if (statusElement) {
                statusElement.textContent = getStatusText(updates.status);
            }
            
            // Update connector after this step
            const stepIndex = parseInt(stepElement.getAttribute('data-step-index'));
            const connector = stepElement.nextElementSibling;
            if (connector && connector.classList.contains('step-connector')) {
                connector.className = `step-connector ${updates.status === 'completed' ? 'completed' : updates.status === 'executing' ? 'active' : updates.status}`;
            }
        }
        
        // Update timing
        if (updates.endTime) {
            const timingElement = stepElement.querySelector('.step-timing');
            if (timingElement && updates.startTime) {
                const duration = ((new Date(updates.endTime) - new Date(updates.startTime)) / 1000).toFixed(1);
                timingElement.textContent = `Completed in ${duration}s`;
            }
        }
        
        // Update transfer data if this is a transfer step
        if (updates.transferData) {
            let stepContent = stepElement.querySelector('.step-content');
            if (!stepContent) {
                stepContent = document.createElement('div');
                stepContent.className = 'step-content';
                stepElement.appendChild(stepContent);
            }
            stepContent.innerHTML = '';
            stepContent.appendChild(this.transferManager.createTransferStatusElement(updates.transferData));
            
            // Start polling for transfer updates
            if (updates.transferData.id && updates.transferData.blockchain) {
                this.transferManager.startTransferPolling(updates.transferData.id, updates.transferData.blockchain);
            }
        }
        
        // Update blockchain verification data if this is a verification step
        if (updates.verificationData) {
            debugLog(`Adding verification data to step: ${JSON.stringify(updates.verificationData)}`, 'info');
            let stepContent = stepElement.querySelector('.step-content');
            if (!stepContent) {
                stepContent = document.createElement('div');
                stepContent.className = 'step-content';
                stepElement.appendChild(stepContent);
            }
            stepContent.innerHTML = '';
            stepContent.appendChild(this.createVerificationStatusElement(updates.verificationData));
        }
        
        // If workflow is complete, update the workflow card status
        if (updates.workflowStatus) {
            this.updateWorkflowStatus(workflowId, updates.workflowStatus);
        }
    }

    updateWorkflowStatus(workflowId, status) {
        const workflowCard = document.querySelector(`[data-workflow-id="${workflowId}"]`);
        if (!workflowCard) return;
        
        const statusBadge = workflowCard.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${status === 'completed' ? 'complete' : status === 'failed' ? 'error' : 'executing'}`;
            statusBadge.textContent = status.toUpperCase();
        }
        
        // Stop polling if workflow is complete
        if (status === 'completed' || status === 'failed') {
            this.stopWorkflowPolling(workflowId);
        }
    }

    async startWorkflowPolling(workflowId) {
        debugLog(`Starting workflow polling for ${workflowId}`, 'info');
        
        // Clear any existing polling
        this.stopWorkflowPolling(workflowId);
        
        const pollWorkflow = async () => {
            try {
                const response = await fetch(`/api/v1/workflow/${workflowId}/status`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Update workflow state
                const previousState = this.workflowStates.get(workflowId);
                this.workflowStates.set(workflowId, data);
                
                // Update UI for changed steps
                if (data.steps) {
                    data.steps.forEach((step, index) => {
                        const prevStep = previousState?.steps?.[index];
                        if (!prevStep || prevStep.status !== step.status || 
                            JSON.stringify(prevStep.verificationData) !== JSON.stringify(step.verificationData)) {
                            this.updateWorkflowStep(workflowId, step.id, {
                                status: step.status,
                                startTime: step.startTime,
                                endTime: step.endTime,
                                transferData: step.transferData,
                                verificationData: step.verificationData
                            });
                        }
                    });
                }
                
                // Update overall workflow status
                if (data.status !== previousState?.status) {
                    this.updateWorkflowStatus(workflowId, data.status);
                }
                
                // Stop polling if workflow is complete
                if (data.status === 'completed' || data.status === 'failed') {
                    this.stopWorkflowPolling(workflowId);
                }
                
            } catch (error) {
                debugLog(`Error polling workflow ${workflowId}: ${error.message}`, 'error');
            }
        };
        
        // Initial poll
        await pollWorkflow();
        
        // Set up interval
        const intervalId = setInterval(pollWorkflow, config.polling.workflowInterval);
        this.workflowPollingIntervals.set(workflowId, intervalId);
        
        // Stop polling after max duration
        setTimeout(() => {
            this.stopWorkflowPolling(workflowId);
        }, config.polling.maxPollingDuration);
    }

    stopWorkflowPolling(workflowId) {
        const intervalId = this.workflowPollingIntervals.get(workflowId);
        if (intervalId) {
            clearInterval(intervalId);
            this.workflowPollingIntervals.delete(workflowId);
            debugLog(`Stopped workflow polling for ${workflowId}`, 'info');
        }
    }

    stopAllPolling() {
        this.workflowPollingIntervals.forEach((intervalId, workflowId) => {
            clearInterval(intervalId);
        });
        this.workflowPollingIntervals.clear();
    }
    
    createVerificationStatusElement(verificationData) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'verification-status';
        
        if (verificationData.success) {
            statusDiv.innerHTML = `
                <div class="blockchain-status success">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 600;">✓ Verified on ${verificationData.blockchain}</span>
                        ${verificationData.explorer_url ? `
                            <a href="${verificationData.explorer_url}" target="_blank" class="explorer-link">
                                View on Blockchain
                            </a>
                        ` : ''}
                    </div>
                    ${verificationData.transaction_hash ? `
                        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                            Tx: ${verificationData.transaction_hash.substring(0, 16)}...
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="blockchain-status error">
                    <div style="font-weight: 600;">✗ Verification Failed</div>
                    ${verificationData.error ? `
                        <div style="font-size: 12px; margin-top: 4px;">
                            ${verificationData.error}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return statusDiv;
    }
}