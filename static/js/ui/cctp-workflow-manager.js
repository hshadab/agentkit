// CCTP Workflow Manager - Base Sepolia Cross-Chain AI Agent Payments
// Integrates with existing UI without modifying other functionality

export class CCTPWorkflowManager {
    constructor(uiManager, wsManager) {
        this.uiManager = uiManager;
        this.wsManager = wsManager;
        this.activeTransfers = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        this.setupMessageHandlers();
        this.injectStyles(); // Ensure styles are loaded
        this.initialized = true;
        console.log('✅ CCTP Workflow Manager initialized for Base Sepolia');
    }
    
    injectStyles() {
        // Inject CSS styles if not already present
        if (!document.getElementById('cctp-workflow-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'cctp-workflow-styles';
            styleElement.textContent = cctpWorkflowStyles;
            document.head.appendChild(styleElement);
            console.log('📄 CCTP workflow styles injected');
        }
    }

    setupMessageHandlers() {
        // Handle CCTP workflow start
        this.wsManager.on('cctp_workflow_started', (data) => {
            console.log('🌉 CCTP Workflow started:', data);
            const workflowCard = this.createCCTPWorkflowCard(data);
            this.uiManager.addMessage(workflowCard, 'assistant');
        });

        // Handle CCTP step updates
        this.wsManager.on('cctp_step_update', (data) => {
            console.log('🔄 CCTP Step update:', data);
            this.updateCCTPStep(data);
        });

        // Handle CCTP completion
        this.wsManager.on('cctp_workflow_complete', (data) => {
            console.log('✅ CCTP Workflow complete:', data);
            this.completeCCTPWorkflow(data);
        });

        // Handle CCTP errors
        this.wsManager.on('cctp_workflow_error', (data) => {
            console.log('❌ CCTP Workflow error:', data);
            this.handleCCTPError(data);
        });
    }

    createCCTPWorkflowCard(data) {
        const card = document.createElement('div');
        card.className = 'workflow-card cctp-workflow';
        card.setAttribute('data-workflow-id', data.workflow_id);
        card.setAttribute('data-workflow-type', 'cctp');

        const steps = this.getCCTPSteps(data);
        
        card.innerHTML = `
            <div class="workflow-header">
                <div class="workflow-title">
                    🌉 Cross-Chain USDC Transfer (CCTP Enhanced)
                    <span class="workflow-subtitle">${data.fromNetwork} → ${data.toNetwork}</span>
                </div>
                <div class="workflow-id">ID: ${data.workflow_id}</div>
                <div class="workflow-status in-progress">IN PROGRESS</div>
            </div>
            <div class="transfer-details">
                <div class="transfer-amount">${data.amount} USDC</div>
                <div class="transfer-agent">Agent: ${data.agentId}</div>
                <div class="transfer-recipient">To: ${data.recipient ? data.recipient.substring(0, 10) + '...' : '0x742d35Cc...'}</div>
            </div>
            <div class="workflow-steps-container">
                ${steps.map((step, index) => this.createCCTPStepHTML(step, index)).join('')}
            </div>
        `;

        return card;
    }

    getCCTPSteps(data) {
        return [
            {
                id: 'zkp_authorization',
                name: 'ZKP Authorization',
                description: 'Generate zero-knowledge proof for agent authorization',
                status: 'awaiting'
            },
            {
                id: 'onchain_verification',
                name: 'On-Chain Verification',
                description: `Verify proof on ${data.fromNetwork}`,
                status: 'awaiting'
            },
            {
                id: 'usdc_burn',
                name: 'USDC Burn',
                description: `Burn USDC on ${data.fromNetwork}`,
                status: 'awaiting'
            },
            {
                id: 'circle_attestation',
                name: 'Circle CCTP Attestation',
                description: 'Enhanced cross-chain message attestation',
                status: 'awaiting'
            },
            {
                id: 'usdc_mint',
                name: 'USDC Mint',
                description: `Mint USDC on ${data.toNetwork}`,
                status: 'awaiting'
            }
        ];
    }

    createCCTPStepHTML(step, index) {
        const statusClass = step.status === 'awaiting' ? 'pending' : 
                           step.status === 'in_progress' ? 'in_progress' : 
                           step.status === 'completed' ? 'completed' : 'pending';
        
        return `
            <div class="workflow-step ${statusClass}" data-step-id="${step.id}">
                <div class="step-header">
                    <div class="step-title">STEP ${index + 1} OF 5</div>
                    <div class="step-status">${step.status === 'completed' ? 'Completed' : 
                                               step.status === 'in_progress' ? 'Processing' : 'Pending'}</div>
                </div>
                <div class="step-content">
                    <div class="step-description">• ${step.description}</div>
                    <div class="step-details" style="display: none;">
                        <div class="step-result">Waiting...</div>
                    </div>
                </div>
            </div>
        `;
    }

    getStepStatusIcon(status) {
        switch (status) {
            case 'completed': return '✅';
            case 'in_progress': return '🔄';
            case 'failed': return '❌';
            default: return '⏳';
        }
    }

    updateCCTPStep(data) {
        const workflowCard = document.querySelector(`[data-workflow-id="${data.workflow_id}"]`);
        if (!workflowCard) return;

        const step = workflowCard.querySelector(`[data-step-id="${data.step_id}"]`);
        if (!step) return;

        // Update step class based on status
        const statusClass = data.status === 'in_progress' ? 'in_progress' : 
                           data.status === 'completed' ? 'completed' : 'pending';
        step.className = `workflow-step ${statusClass}`;
        
        // Update step status text
        const stepStatus = step.querySelector('.step-status');
        if (stepStatus) {
            stepStatus.textContent = data.status === 'completed' ? 'Completed' : 
                                   data.status === 'in_progress' ? 'Processing' : 'Pending';
        }

        // Update step details
        const stepDetails = step.querySelector('.step-details');
        const stepResult = step.querySelector('.step-result');
        
        if (stepDetails && stepResult) {
            stepDetails.style.display = 'block';
            
            if (data.status === 'completed' && data.result) {
                stepResult.innerHTML = this.formatStepResult(data.step_id, data.result);
            } else if (data.status === 'in_progress') {
                stepResult.textContent = data.message || 'Processing...';
            } else if (data.status === 'failed') {
                stepResult.innerHTML = `<span class="error">Error: ${data.error}</span>`;
            }
        }
    }

    formatStepResult(stepId, result) {
        switch (stepId) {
            case 'zkp_authorization':
                return `<span class="success">✅ Proof generated: ${result.proofId}</span>`;
            case 'onchain_verification':
                const contractLink = `<a href="https://sepolia.basescan.org/address/0x74D68B2481d298F337e62efc50724CbBA68dCF8f" target="_blank" class="contract-link" title="Base Verifier Contract">📄 Verifier</a>`;
                return `<span class="success">✅ Verified on-chain: <a href="${result.explorerUrl}" target="_blank">${result.transactionHash?.substring(0, 10)}...</a> ${contractLink}</span>`;
            case 'usdc_burn':
                return `<span class="success">✅ USDC burned: <a href="${result.explorerUrl}" target="_blank">${result.transactionHash?.substring(0, 10)}...</a></span>`;
            case 'circle_attestation':
                return `<span class="success">✅ Attestation received</span>`;
            case 'usdc_mint':
                return `<span class="success">✅ USDC minted: <a href="${result.explorerUrl}" target="_blank">${result.transactionHash?.substring(0, 10)}...</a></span>`;
            default:
                return `<span class="success">✅ Completed</span>`;
        }
    }

    updateProgressBar(workflowCard, data) {
        const progressFill = workflowCard.querySelector('.progress-fill');
        const progressText = workflowCard.querySelector('.progress-text');
        
        if (!progressFill || !progressText) return;

        const steps = ['zkp_authorization', 'onchain_verification', 'usdc_burn', 'circle_attestation', 'usdc_mint'];
        const currentStepIndex = steps.indexOf(data.step_id);
        const progress = data.status === 'completed' ? 
            ((currentStepIndex + 1) / steps.length) * 100 : 
            (currentStepIndex / steps.length) * 100;

        progressFill.style.width = `${progress}%`;
        progressFill.setAttribute('data-progress', progress);

        if (data.status === 'in_progress') {
            progressText.textContent = data.message || `Processing ${data.step_id}...`;
        } else if (data.status === 'completed') {
            if (currentStepIndex === steps.length - 1) {
                progressText.textContent = 'Transfer completed successfully!';
            } else {
                progressText.textContent = `${data.step_id} completed`;
            }
        }
    }

    activateNextStep(workflowCard, completedStepId) {
        const steps = ['zkp_authorization', 'onchain_verification', 'usdc_burn', 'circle_attestation', 'usdc_mint'];
        const currentIndex = steps.indexOf(completedStepId);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < steps.length) {
            const nextStepId = steps[nextIndex];
            const nextStep = workflowCard.querySelector(`[data-step-id="${nextStepId}"]`);
            if (nextStep) {
                const indicator = nextStep.querySelector('.step-indicator');
                if (indicator) {
                    indicator.classList.add('active');
                }
            }
        }
    }

    completeCCTPWorkflow(data) {
        const workflowCard = document.querySelector(`[data-workflow-id="${data.workflow_id}"]`);
        if (!workflowCard) return;

        // Update workflow status
        const statusElement = workflowCard.querySelector('.workflow-status');
        if (statusElement) {
            statusElement.className = 'workflow-status completed';
            statusElement.textContent = 'COMPLETED';
        }

        // Show success toast
        this.uiManager.showToast(`✅ ${data.amount} USDC transferred successfully!`, 'success');
    }

    handleCCTPError(data) {
        const workflowCard = document.querySelector(`[data-workflow-id="${data.workflow_id}"]`);
        if (!workflowCard) return;

        // Update card status
        const statusBadge = workflowCard.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = 'status-badge failed';
            statusBadge.textContent = 'Failed';
        }

        // Update progress text
        const progressText = workflowCard.querySelector('.progress-text');
        if (progressText) {
            progressText.innerHTML = `<span class="error">❌ Transfer failed: ${data.error}</span>`;
        }

        // Show error toast
        this.uiManager.showToast(`❌ CCTP transfer failed: ${data.error}`, 'error');
    }

    // Check if a message is a CCTP workflow command
    static isCCTPCommand(message) {
        const lowerMessage = message.toLowerCase();
        return (
            (lowerMessage.includes('transfer') || 
             lowerMessage.includes('send') || 
             lowerMessage.includes('execute') ||
             lowerMessage.includes('payment')) &&
            lowerMessage.includes('usdc') &&
            (lowerMessage.includes('cross-chain') || 
             lowerMessage.includes('base') ||
             lowerMessage.includes('cctp') ||
             lowerMessage.includes('via cctp') ||
             (lowerMessage.includes('to base') && lowerMessage.includes('zkp')) ||
             (lowerMessage.includes('from ethereum') && lowerMessage.includes('base')))
        );
    }

    // Parse CCTP command from natural language
    static parseCCTPCommand(message) {
        const patterns = {
            amount: /(\d+(?:\.\d+)?)\s*usdc/i,
            agent: /agent\s+([a-zA-Z0-9_]+)/i,
            recipient: /(0x[0-9a-fA-F]{40})/i,
            fromNetwork: /from\s+(ethereum|eth)/i,
            toNetwork: /to\s+(base)/i
        };

        const result = {};
        
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = message.match(pattern);
            if (match) {
                if (key === 'recipient') {
                    result[key] = match[1]; // Use the full address
                } else {
                    result[key] = match[1] || match[2];
                }
            }
        }

        // Improve agent parsing for "for agent xxx" pattern
        const agentMatch = message.match(/for\s+agent\s+([a-zA-Z0-9_]+)/i);
        if (agentMatch) {
            result.agent = agentMatch[1];
        }

        // Normalize network names and set defaults (case-insensitive)
        if (result.fromNetwork) {
            console.log('🔍 Original fromNetwork:', result.fromNetwork);
            const fromLower = result.fromNetwork.toLowerCase();
            if (fromLower === 'ethereum' || fromLower === 'eth') {
                result.fromNetwork = 'ethereum-sepolia';
                console.log('✅ Normalized to:', result.fromNetwork);
            }
        }
        result.fromNetwork = result.fromNetwork || 'ethereum-sepolia';
        result.toNetwork = 'base-sepolia'; // Always Base for now
        result.amount = result.amount || '0.01'; // Small amount for testing
        result.agent = result.agent || 'cross_chain_executor_001';
        result.recipient = result.recipient || '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87';

        return result;
    }
}

// CSS styles for CCTP workflow cards
export const cctpWorkflowStyles = `
.cctp-workflow {
    border-left: 4px solid #0052FF;
    background: linear-gradient(135deg, rgba(0, 82, 255, 0.05) 0%, rgba(0, 82, 255, 0.02) 100%);
}

.cctp-header {
    background: rgba(0, 82, 255, 0.1);
}

.cctp-route {
    font-size: 0.85em;
    color: #0052FF;
    font-weight: 600;
    margin-left: 8px;
}

.cctp-details {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(0, 82, 255, 0.05);
    border-radius: 6px;
}

.transfer-info {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.transfer-info .amount {
    font-weight: 700;
    color: #0052FF;
    font-size: 1.1em;
}

.transfer-info .agent,
.transfer-info .recipient {
    font-size: 0.9em;
    color: #666;
}

.cctp-steps {
    margin: 16px 0;
}

.cctp-step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.cctp-step.pending {
    opacity: 0.7;
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(40, 40, 40, 0.6) 100%);
    border-style: dashed;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.cctp-step.in_progress {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.15) 100%);
    border-color: #fbbf24;
    border-style: solid;
    animation: pulseGlow 2s ease-in-out infinite;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2), 
                0 8px 24px rgba(251, 191, 36, 0.4),
                inset 0 0 20px rgba(251, 191, 36, 0.08);
}

.cctp-step.completed {
    background: rgba(0, 0, 0, 0.3);
    border-color: #10b981;
    border-style: solid;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), 
                0 4px 16px rgba(16, 185, 129, 0.3),
                inset 0 0 20px rgba(16, 185, 129, 0.08);
}

.cctp-step.failed {
    background: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
}

.step-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e5e7eb;
    margin-right: 12px;
    position: relative;
    transition: all 0.3s ease;
}

.step-indicator.active {
    background: #3b82f6;
    color: white;
    transform: scale(1.1);
}

.step-indicator .step-number {
    font-size: 0.85em;
    font-weight: 600;
}

.step-indicator .step-icon {
    position: absolute;
    font-size: 0.9em;
}

.step-content {
    flex: 1;
}

.step-name {
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
}

.step-description {
    font-size: 0.9em;
    color: #6b7280;
    margin-bottom: 8px;
}

.step-details {
    font-size: 0.85em;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    margin-top: 8px;
}

.step-details .success {
    color: #059669;
}

.step-details .error {
    color: #dc2626;
}

.workflow-progress {
    margin-top: 16px;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6 0%, #0052FF 100%);
    transition: width 0.5s ease;
    border-radius: 4px;
}

.progress-text {
    font-size: 0.9em;
    color: #6b7280;
    text-align: center;
}

.completion-details {
    font-size: 0.85em;
    color: #059669;
    margin-top: 4px;
}

.explorer-link {
    color: #0052FF;
    text-decoration: none;
    font-weight: 500;
}

.explorer-link:hover {
    text-decoration: underline;
}

@keyframes pulseGlow {
    0%, 100% { 
        box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2), 
                   0 8px 24px rgba(251, 191, 36, 0.4),
                   inset 0 0 20px rgba(251, 191, 36, 0.08);
    }
    50% { 
        box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.15), 
                   0 12px 36px rgba(251, 191, 36, 0.5),
                   inset 0 0 30px rgba(251, 191, 36, 0.15);
    }
}

.contract-link {
    color: #6b7c99;
    text-decoration: none;
    font-size: 0.85em;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(107, 124, 153, 0.1);
    transition: all 0.2s ease;
}

.contract-link:hover {
    background: rgba(107, 124, 153, 0.2);
    color: #0052FF;
}
`;