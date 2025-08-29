// WorkflowProgress Component - SES-safe modular component
// Displays multi-step workflow progress with visual indicators

window.WorkflowProgress = (function() {
    'use strict';
    
    // Workflow configurations
    const WORKFLOWS = {
        'gateway_zkml': {
            name: 'Gateway zkML Workflow',
            steps: [
                { id: 'zkml_proof', label: 'Generate zkML Proof', icon: '🤖' },
                { id: 'ethereum_verify', label: 'Verify on Ethereum', icon: '⟠' },
                { id: 'gateway_transfer', label: 'Gateway Transfer', icon: '💸' },
                { id: 'attestation', label: 'Receive Attestation', icon: '📜' }
            ]
        },
        'zkengine_compile': {
            name: 'zkEngine Compilation',
            steps: [
                { id: 'c_code', label: 'C Code Input', icon: '📝' },
                { id: 'compile_wasm', label: 'Compile to WASM', icon: '⚙️' },
                { id: 'generate_proof', label: 'Generate Proof', icon: '🔐' },
                { id: 'verify', label: 'Verify Proof', icon: '✅' }
            ]
        },
        'multi_chain': {
            name: 'Multi-Chain Verification',
            steps: [
                { id: 'generate', label: 'Generate Proof', icon: '🔧' },
                { id: 'chain_1', label: 'Verify Chain 1', icon: '🔵' },
                { id: 'chain_2', label: 'Verify Chain 2', icon: '🟢' },
                { id: 'aggregate', label: 'Aggregate Results', icon: '📊' }
            ]
        },
        'medical_records': {
            name: 'Medical Records Workflow',
            steps: [
                { id: 'encrypt', label: 'Encrypt Records', icon: '🔒' },
                { id: 'hash', label: 'Generate Hash', icon: '#️⃣' },
                { id: 'proof', label: 'Create Privacy Proof', icon: '🏥' },
                { id: 'avalanche', label: 'Store on Avalanche', icon: '🔺' }
            ]
        },
        'iot_proximity': {
            name: 'IoT Proximity Verification',
            steps: [
                { id: 'device_data', label: 'Collect Device Data', icon: '📡' },
                { id: 'proximity_calc', label: 'Calculate Proximity', icon: '📍' },
                { id: 'proof_gen', label: 'Generate Proof', icon: '🔐' },
                { id: 'iotex_verify', label: 'Verify on IoTeX', icon: '🌐' }
            ]
        }
    };
    
    // Step states
    const STEP_STATES = {
        PENDING: 'pending',
        EXECUTING: 'executing',
        COMPLETE: 'complete',
        FAILED: 'failed',
        SKIPPED: 'skipped'
    };
    
    // Create workflow progress HTML
    function create(workflowData) {
        const workflowType = workflowData.type || 'gateway_zkml';
        const workflow = WORKFLOWS[workflowType];
        const cardId = 'workflow-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const html = `
            <div class="workflow-progress" id="${cardId}" data-workflow="${workflowType}">
                <div class="workflow-header">
                    <div class="workflow-title">${workflow.name}</div>
                    <div class="workflow-status ${workflowData.status || 'in-progress'}">
                        ${formatStatus(workflowData.status || 'in-progress')}
                    </div>
                </div>
                
                <div class="workflow-timeline">
                    ${renderTimeline(workflow.steps, workflowData.currentStep, workflowData.stepStates)}
                </div>
                
                <div class="workflow-details">
                    ${renderCurrentStepDetails(workflow.steps, workflowData.currentStep, workflowData)}
                </div>
                
                ${workflowData.progress !== undefined ? `
                <div class="workflow-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${workflowData.progress}%"></div>
                    </div>
                    <span class="progress-text">${workflowData.progress}% Complete</span>
                </div>
                ` : ''}
                
                <div class="workflow-actions">
                    ${renderWorkflowActions(workflowData, workflowType)}
                </div>
            </div>
        `;
        
        return { html, cardId };
    }
    
    // Render workflow timeline
    function renderTimeline(steps, currentStep, stepStates = {}) {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        
        return steps.map((step, index) => {
            const state = stepStates[step.id] || (
                index < currentIndex ? STEP_STATES.COMPLETE :
                index === currentIndex ? STEP_STATES.EXECUTING :
                STEP_STATES.PENDING
            );
            
            return `
                <div class="timeline-step ${state}" data-step-id="${step.id}">
                    <div class="step-connector ${index === 0 ? 'first' : ''} ${index === steps.length - 1 ? 'last' : ''}"></div>
                    <div class="step-node">
                        <span class="step-icon">${step.icon}</span>
                        ${state === STEP_STATES.EXECUTING ? '<div class="step-spinner"></div>' : ''}
                    </div>
                    <div class="step-label">${step.label}</div>
                    ${state === STEP_STATES.COMPLETE ? '<div class="step-checkmark">✓</div>' : ''}
                    ${state === STEP_STATES.FAILED ? '<div class="step-error">✗</div>' : ''}
                </div>
            `;
        }).join('');
    }
    
    // Render current step details
    function renderCurrentStepDetails(steps, currentStep, data) {
        const step = steps.find(s => s.id === currentStep);
        if (!step) return '';
        
        let details = `
            <div class="current-step-container">
                <div class="current-step-header">
                    <span class="current-step-icon">${step.icon}</span>
                    <span class="current-step-title">Current: ${step.label}</span>
                </div>
        `;
        
        if (data.stepMessage) {
            details += `<div class="step-message">${data.stepMessage}</div>`;
        }
        
        if (data.stepDetails) {
            details += '<div class="step-details-grid">';
            Object.entries(data.stepDetails).forEach(([key, value]) => {
                details += `
                    <div class="step-detail">
                        <span class="detail-label">${formatLabel(key)}:</span>
                        <span class="detail-value">${value}</span>
                    </div>
                `;
            });
            details += '</div>';
        }
        
        if (data.estimatedTime) {
            details += `
                <div class="estimated-time">
                    <span class="time-icon">⏱️</span>
                    Estimated time: ${data.estimatedTime}
                </div>
            `;
        }
        
        details += '</div>';
        return details;
    }
    
    // Render workflow action buttons
    function renderWorkflowActions(data, workflowType) {
        const actions = [];
        
        if (data.status === 'paused') {
            actions.push(`<button class="workflow-action-btn resume" onclick="WorkflowProgress.resume('${data.id}')">Resume Workflow</button>`);
        }
        
        if (data.status === 'in-progress' && data.canPause) {
            actions.push(`<button class="workflow-action-btn pause" onclick="WorkflowProgress.pause('${data.id}')">Pause Workflow</button>`);
        }
        
        if (data.status === 'failed') {
            actions.push(`<button class="workflow-action-btn retry" onclick="WorkflowProgress.retry('${data.id}', '${workflowType}')">Retry Workflow</button>`);
        }
        
        if (data.status === 'complete') {
            actions.push(`<button class="workflow-action-btn view-results" onclick="WorkflowProgress.viewResults('${data.id}')">View Results</button>`);
        }
        
        if (data.canCancel) {
            actions.push(`<button class="workflow-action-btn cancel" onclick="WorkflowProgress.cancel('${data.id}')">Cancel</button>`);
        }
        
        return actions.join('');
    }
    
    // Update existing workflow
    function update(cardId, newData) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        const workflowType = card.dataset.workflow;
        const workflow = WORKFLOWS[workflowType];
        
        // Update status
        const statusDiv = card.querySelector('.workflow-status');
        if (statusDiv) {
            statusDiv.className = `workflow-status ${newData.status}`;
            statusDiv.textContent = formatStatus(newData.status);
        }
        
        // Update timeline
        const timeline = card.querySelector('.workflow-timeline');
        if (timeline) {
            timeline.innerHTML = renderTimeline(workflow.steps, newData.currentStep, newData.stepStates);
        }
        
        // Update details
        const details = card.querySelector('.workflow-details');
        if (details) {
            details.innerHTML = renderCurrentStepDetails(workflow.steps, newData.currentStep, newData);
        }
        
        // Update progress bar
        if (newData.progress !== undefined) {
            let progressBar = card.querySelector('.workflow-progress-bar');
            if (progressBar) {
                const fill = progressBar.querySelector('.progress-fill');
                const text = progressBar.querySelector('.progress-text');
                fill.style.width = newData.progress + '%';
                text.textContent = newData.progress + '% Complete';
            } else {
                // Add progress bar if it doesn't exist
                const detailsDiv = card.querySelector('.workflow-details');
                progressBar = document.createElement('div');
                progressBar.className = 'workflow-progress-bar';
                progressBar.innerHTML = `
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${newData.progress}%"></div>
                    </div>
                    <span class="progress-text">${newData.progress}% Complete</span>
                `;
                detailsDiv.after(progressBar);
            }
        }
        
        // Update actions
        const actionsDiv = card.querySelector('.workflow-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = renderWorkflowActions(newData, workflowType);
        }
    }
    
    // Update specific step state
    function updateStep(cardId, stepId, state, message) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        const stepElement = card.querySelector(`[data-step-id="${stepId}"]`);
        if (stepElement) {
            stepElement.className = `timeline-step ${state}`;
            
            // Add checkmark or error if needed
            if (state === STEP_STATES.COMPLETE) {
                if (!stepElement.querySelector('.step-checkmark')) {
                    const checkmark = document.createElement('div');
                    checkmark.className = 'step-checkmark';
                    checkmark.textContent = '✓';
                    stepElement.appendChild(checkmark);
                }
            } else if (state === STEP_STATES.FAILED) {
                if (!stepElement.querySelector('.step-error')) {
                    const error = document.createElement('div');
                    error.className = 'step-error';
                    error.textContent = '✗';
                    stepElement.appendChild(error);
                }
            }
        }
    }
    
    // Helper functions
    function formatStatus(status) {
        return status.replace(/-/g, ' ').replace(/_/g, ' ').toUpperCase();
    }
    
    function formatLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Action handlers
    function resume(workflowId) {
        console.log('Resuming workflow:', workflowId);
        window.dispatchEvent(new CustomEvent('resumeWorkflow', { detail: { workflowId } }));
    }
    
    function pause(workflowId) {
        console.log('Pausing workflow:', workflowId);
        window.dispatchEvent(new CustomEvent('pauseWorkflow', { detail: { workflowId } }));
    }
    
    function retry(workflowId, workflowType) {
        console.log('Retrying workflow:', workflowId, workflowType);
        window.dispatchEvent(new CustomEvent('retryWorkflow', { detail: { workflowId, workflowType } }));
    }
    
    function cancel(workflowId) {
        console.log('Cancelling workflow:', workflowId);
        window.dispatchEvent(new CustomEvent('cancelWorkflow', { detail: { workflowId } }));
    }
    
    function viewResults(workflowId) {
        console.log('Viewing results for workflow:', workflowId);
        window.dispatchEvent(new CustomEvent('viewWorkflowResults', { detail: { workflowId } }));
    }
    
    // Public API
    return {
        create,
        update,
        updateStep,
        resume,
        pause,
        retry,
        cancel,
        viewResults,
        WORKFLOWS,
        STEP_STATES
    };
})();