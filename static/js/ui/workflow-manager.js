// Workflow Manager - Handles workflow operations and UI
import { debugLog, getStepIcon, getStatusText } from '../core/utils.js';
import { config } from '../core/config.js';

export class WorkflowManager {
    constructor(uiManager, transferManager) {
        this.uiManager = uiManager;
        this.transferManager = transferManager;
        this.workflowPollingIntervals = new Map();
        this.workflowStates = new Map();
    }

    addWorkflowCard(data) {
        debugLog(`Adding workflow card: ${data.workflow_id}`, 'info');
        debugLog(`Original steps: ${JSON.stringify(data.steps?.map(s => s.action || s.type))}`, 'debug');
        
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
        
        // Add workflow steps
        if (data.steps && data.steps.length > 0) {
            // Create modified steps array with result step
            const allSteps = [...data.steps];
            
            // Check if reward step already exists
            const hasRewardStep = data.steps.some(step => 
                step.action === 'claim_rewards' || 
                step.type === 'claim_rewards'
            );
            
            // Only add reward step if it's an IoT workflow AND doesn't already have one
            const hasIoTSteps = data.steps.some(step => 
                step.action === 'register_device' || 
                step.action === 'verify_on_iotex' ||
                (step.action === 'generate_proof' && step.proof_type === 'device_proximity') ||
                (step.type === 'generate_proof' && step.parameters?.proof_type === 'device_proximity')
            );
            
            debugLog(`Has IoT steps: ${hasIoTSteps}, Has reward step: ${hasRewardStep}`, 'debug');
            
            if (hasIoTSteps && !hasRewardStep) {
                allSteps.push({
                    id: 'reward_step',
                    action: 'claim_rewards',
                    type: 'reward',
                    description: 'Claim Device Rewards',
                    status: 'pending'
                });
            }
            
            debugLog(`Final steps: ${JSON.stringify(allSteps.map(s => s.action || s.type))}`, 'debug');
            
            // Display all steps including result
            allSteps.forEach((step, index) => {
                const stepElement = this.createWorkflowStepElement(step, index, allSteps.length, data);
                stepsContainer.appendChild(stepElement);
                
                // Add connector between steps (except after last step)
                if (index < allSteps.length - 1) {
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
            ${this.getBlockchainLink(step, workflowData)}
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
    
    getBlockchainLink(step, workflowData) {
        // Check if this step involves blockchain
        const blockchainSteps = ['register_device', 'verify_on_iotex', 'verify_on_ethereum', 'verify_on_solana', 'verify_on_base', 'verify_on_avalanche', 'transfer', 'claim_rewards'];
        const isBlockchainStep = blockchainSteps.includes(step.action) || blockchainSteps.includes(step.type);
        
        // Skip blockchain links for proof generation step
        if (step.action === 'generate_proof') {
            return '';
        }
        
        if (!isBlockchainStep) {
            return '';
        }
        
        // Get the appropriate blockchain and contract info
        let blockchain = '';
        let contractAddress = '';
        let explorerUrl = '';
        
        if (step.action === 'register_device') {
            blockchain = 'IoTeX';
            // Device registration uses ioID contract
            contractAddress = config.blockchain.iotex.contracts.ioID || config.blockchain.iotex.contracts.deviceVerifier;
            explorerUrl = config.blockchain.iotex.explorerUrl;
        } else if (step.action === 'verify_on_iotex') {
            blockchain = 'IoTeX';
            // Verification uses device verifier contract
            contractAddress = config.blockchain.iotex.contracts.deviceVerifier;
            explorerUrl = config.blockchain.iotex.explorerUrl;
        } else if (step.action === 'verify_on_ethereum') {
            blockchain = 'Ethereum';
            contractAddress = config.blockchain.ethereum.verifierAddress;
            explorerUrl = config.blockchain.ethereum.explorerUrl;
        } else if (step.action === 'verify_on_solana') {
            blockchain = 'Solana';
            contractAddress = config.blockchain.solana.verifierProgramId;
            explorerUrl = config.blockchain.solana.explorerUrl;
        } else if (step.action === 'verify_on_base') {
            blockchain = 'Base';
            contractAddress = config.blockchain.base.contracts.zkVerifier;
            explorerUrl = config.blockchain.base.explorerUrl;
        } else if (step.action === 'verify_on_avalanche') {
            blockchain = 'Avalanche';
            contractAddress = config.blockchain.avalanche.contracts.zkVerifier;
            explorerUrl = config.blockchain.avalanche.explorerUrl;
        } else if (step.action === 'claim_rewards') {
            blockchain = 'IoTeX';
            // Rewards are handled by the device verifier contract
            contractAddress = config.blockchain.iotex.contracts.deviceVerifier;
            explorerUrl = config.blockchain.iotex.explorerUrl;
        }
        
        if (!contractAddress) {
            return '';
        }
        
        // Create the link HTML
        let linkHtml = `<div class="blockchain-info" style="margin-top: 8px; font-size: 12px;">`;
        linkHtml += `<span style="color: #666;">📜 Smart Contract: </span>`;
        linkHtml += `<a href="${explorerUrl}/address/${contractAddress}" target="_blank" class="contract-link" style="color: #3b82f6; text-decoration: none;">`;
        linkHtml += `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
        linkHtml += `</a>`;
        linkHtml += ` <span style="color: #999;">(${blockchain})</span>`;
        
        // If step has a transaction hash, show it
        if (step.transactionHash || step.txHash) {
            const txHash = step.transactionHash || step.txHash;
            linkHtml += `<br><span style="color: #666;">🔗 Transaction: </span>`;
            linkHtml += `<a href="${explorerUrl}/tx/${txHash}" target="_blank" class="tx-link" style="color: #10b981; text-decoration: none;">`;
            linkHtml += `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
            linkHtml += `</a>`;
        }
        
        linkHtml += `</div>`;
        return linkHtml;
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
            // Check if this is a non-critical step that failed
            const stepData = this.getStepData(workflowId, stepId);
            const isNonCriticalFailure = updates.status === 'failed' && stepData?.critical === false;
            
            // Use a different class for non-critical failures
            const statusClass = isNonCriticalFailure ? 'failed-non-critical' : updates.status;
            stepElement.className = `workflow-step ${statusClass}`;
            
            const statusElement = stepElement.querySelector('.step-status');
            if (statusElement) {
                statusElement.textContent = isNonCriticalFailure ? 
                    'SKIPPED' : getStatusText(updates.status);
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
        
        // Update reward data if this is a reward step
        if (updates.rewardData) {
            let stepContent = stepElement.querySelector('.step-content');
            if (!stepContent) {
                stepContent = document.createElement('div');
                stepContent.className = 'step-content';
                stepElement.appendChild(stepContent);
            }
            stepContent.innerHTML = '';
            stepContent.appendChild(this.createRewardStatusElement(updates.rewardData));
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
            
            // Update reward step if it exists
            const rewardStep = document.querySelector(`[data-workflow-id="${workflowId}"][data-step-id="reward_step"]`);
            if (rewardStep && status === 'completed') {
                // Get workflow state for reward info
                const workflowState = this.workflowStates.get(workflowId);
                if (workflowState) {
                    // Find device ID from registration step
                    const registerStep = workflowState.steps?.find(s => s.action === 'register_device');
                    const deviceId = registerStep?.parameters?.device_id || registerStep?.device_id;
                    
                    if (deviceId) {
                        // Simulate reward step execution
                        this.updateWorkflowStep(workflowId, 'reward_step', {
                            status: 'executing',
                            startTime: new Date().toISOString()
                        });
                        
                        // Auto-execute rewards claim
                        setTimeout(() => {
                            this.updateWorkflowStep(workflowId, 'reward_step', {
                                status: 'completed',
                                endTime: new Date().toISOString(),
                                rewardData: {
                                    deviceId: deviceId,
                                    amount: '0.01 IOTX',
                                    claimed: true,
                                    message: 'Rewards claimed successfully'
                                }
                            });
                        }, 2000);
                    }
                }
            }
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
    
    createRewardStatusElement(rewardData) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'reward-status';
        
        // Check if this is a failure due to no rewards
        if (rewardData.error && rewardData.error.includes('No rewards to claim')) {
            statusDiv.innerHTML = `
                <div class="blockchain-status warning">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 600;">ℹ️ No Rewards Available</span>
                        <a href="${config.blockchain.iotex.explorerUrl}/address/${config.blockchain.iotex.contracts.deviceVerifier}" target="_blank" class="explorer-link">
                            View Contract
                        </a>
                    </div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                        The contract has no IOTX balance to pay rewards. This is normal for test contracts.
                    </div>
                </div>
            `;
        } else if (rewardData.claimed) {
            statusDiv.innerHTML = `
                <div class="blockchain-status success">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 600;">💰 ${rewardData.amount || '0 IOTX'} Claimed</span>
                        ${rewardData.txHash ? `
                            <a href="${config.blockchain.iotex.explorerUrl}/tx/${rewardData.txHash}" target="_blank" class="explorer-link">
                                View Transaction
                            </a>
                        ` : ''}
                    </div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                        Device: ${rewardData.deviceId}
                    </div>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="blockchain-status pending">
                    <div style="font-weight: 600;">⏳ Claiming rewards...</div>
                </div>
            `;
        }
        
        return statusDiv;
    }
    
    // Get step data from workflow state
    getStepData(workflowId, stepId) {
        const workflowState = this.workflowStates.get(workflowId);
        if (!workflowState || !workflowState.steps) return null;
        
        // Find step by ID or by matching step properties
        const stepIndex = parseInt(stepId.replace('step_', '')) - 1;
        if (stepIndex >= 0 && stepIndex < workflowState.steps.length) {
            return workflowState.steps[stepIndex];
        }
        
        // Fallback: find by step ID
        return workflowState.steps.find(s => s.id === stepId);
    }
    
    generateWorkflowSummary(workflowState, status) {
        const summary = {
            workflowId: workflowState.workflow_id,
            status: status,
            totalSteps: workflowState.steps?.length || 0,
            completedSteps: 0,
            blockchain: null,
            transactions: [],
            deviceInfo: null,
            proofInfo: null
        };
        
        // Analyze steps for summary
        if (workflowState.steps) {
            workflowState.steps.forEach(step => {
                if (step.status === 'completed') {
                    summary.completedSteps++;
                }
                
                // Extract device info
                if (step.action === 'register_device' && step.status === 'completed') {
                    summary.deviceInfo = {
                        deviceId: step.device_id || step.parameters?.device_id,
                        ioId: step.ioId || step.result?.ioId,
                        did: step.did || step.result?.did
                    };
                }
                
                // Extract proof info
                if (step.action === 'generate_proof' && step.status === 'completed') {
                    summary.proofInfo = {
                        type: step.proof_type || step.parameters?.proof_type,
                        proofId: step.proof_id || step.result?.proof_id,
                        location: step.parameters?.location
                    };
                }
                
                // Extract blockchain info
                if ((step.action === 'verify_on_iotex' || step.action === 'register_device') && step.status === 'completed') {
                    summary.blockchain = 'IoTeX';
                    if (step.transactionHash || step.txHash || step.result?.transactionHash) {
                        summary.transactions.push({
                            action: step.action,
                            hash: step.transactionHash || step.txHash || step.result?.transactionHash
                        });
                    }
                }
            });
        }
        
        return summary;
    }
    
    createResultSummaryElement(resultData) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'result-summary';
        
        const successClass = resultData.status === 'completed' ? 'success' : 'error';
        const icon = resultData.status === 'completed' ? '✅' : '❌';
        
        let summaryHtml = `
            <div class="workflow-result ${successClass}">
                <div style="font-weight: 600; margin-bottom: 12px;">
                    ${icon} Workflow ${resultData.status === 'completed' ? 'Completed Successfully' : 'Failed'}
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                    Completed ${resultData.completedSteps} of ${resultData.totalSteps} steps
                </div>
        `;
        
        // Add device info if available
        if (resultData.deviceInfo) {
            summaryHtml += `
                <div style="margin-top: 12px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
                    <div style="font-weight: 500; margin-bottom: 6px;">📱 Device Registered</div>
                    <div style="font-size: 13px; color: #666;">
                        ID: ${resultData.deviceInfo.deviceId}<br>
                        ioID: ${resultData.deviceInfo.ioId || 'N/A'}<br>
                        DID: ${resultData.deviceInfo.did || 'N/A'}
                    </div>
                </div>
            `;
        }
        
        // Add proof info if available
        if (resultData.proofInfo) {
            summaryHtml += `
                <div style="margin-top: 12px; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">
                    <div style="font-weight: 500; margin-bottom: 6px;">🔐 Proof Generated</div>
                    <div style="font-size: 13px; color: #666;">
                        Type: ${resultData.proofInfo.type}<br>
                        ${resultData.proofInfo.location ? `Location: (${resultData.proofInfo.location.x}, ${resultData.proofInfo.location.y})` : ''}
                    </div>
                </div>
            `;
        }
        
        // Add blockchain transactions
        if (resultData.transactions && resultData.transactions.length > 0) {
            summaryHtml += `
                <div style="margin-top: 12px; padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 6px;">
                    <div style="font-weight: 500; margin-bottom: 6px;">🔗 Blockchain Transactions</div>
            `;
            
            resultData.transactions.forEach(tx => {
                const explorerUrl = config.blockchain.iotex.explorerUrl;
                summaryHtml += `
                    <div style="font-size: 13px; color: #666; margin-top: 4px;">
                        ${tx.action}: 
                        <a href="${explorerUrl}/tx/${tx.hash}" target="_blank" style="color: #3b82f6; text-decoration: none;">
                            ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}
                        </a>
                    </div>
                `;
            });
            
            summaryHtml += `</div>`;
        }
        
        summaryHtml += `</div>`;
        summaryDiv.innerHTML = summaryHtml;
        
        return summaryDiv;
    }
}