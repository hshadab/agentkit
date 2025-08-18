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
            <div class="card-header">
                <div class="card-header-row">
                    <div class="card-title">CROSS-CHAIN TRANSFER PROTOCOL</div>
                    <div class="workflow-status in-progress">IN PROGRESS</div>
                </div>
                <div class="card-function-name">🌉 USDC Bridge ${data.fromNetwork} → ${data.toNetwork}</div>
                <div class="workflow-id" style="font-size: 11px; color: #8b9aff; opacity: 0.7;">ID: ${data.workflow_id}</div>
            </div>
            <div class="transfer-details" style="display: flex; gap: 16px; margin: 12px 0; font-size: 13px;">
                <div class="transfer-amount" style="color: #10b981; font-weight: 600;">${data.amount} USDC</div>
                <div class="transfer-agent" style="color: #8b9aff;">Agent: ${data.agentId}</div>
                <div class="transfer-recipient" style="color: #9ca3af;">To: ${data.recipient ? data.recipient.substring(0, 10) + '...' : '0x742d35Cc...'}</div>
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
                           step.status === 'in_progress' ? 'executing' : 
                           step.status === 'completed' ? 'completed' : 'pending';
        
        return `
            <div class="workflow-step ${statusClass}" data-step-id="${step.id}">
                <div class="workflow-step-header">
                    <div class="step-details">
                        <div class="step-title" style="font-size: 11px; color: #8b9aff; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">
                            STEP ${index + 1} OF 5
                        </div>
                        <div class="step-name" style="font-size: 14px; color: #ffffff; font-weight: 500; margin-bottom: 6px;">
                            ${step.description}
                        </div>
                        <div class="step-message" style="font-size: 12px; color: #9ca3af; line-height: 1.4;">
                            ${this.getStepMessage(step.status)}
                        </div>
                    </div>
                    <div class="step-status ${statusClass}" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; letter-spacing: 0.05em;">
                        ${this.getStepStatusText(step.status)}
                    </div>
                </div>
                <div class="step-content" id="step-content-${step.id}" style="margin-top: 8px;">
                    <!-- Dynamic content will be added here -->
                </div>
            </div>
        `;
    }

    getStepStatusText(status) {
        switch (status) {
            case 'completed': return 'COMPLETED';
            case 'in_progress': return 'PROCESSING';
            case 'executing': return 'PROCESSING';
            case 'failed': return 'FAILED';
            default: return 'PENDING';
        }
    }
    
    getStepMessage(status) {
        switch (status) {
            case 'completed': return '✅ Step completed successfully';
            case 'in_progress': return '⏳ Processing... Check MetaMask if needed';
            case 'executing': return '⏳ Processing... Check MetaMask if needed';
            case 'failed': return '❌ Step failed - check console for details';
            default: return 'Waiting for previous steps to complete';
        }
    }
    
    getExplorerName(network) {
        switch (network) {
            case 'ethereum-sepolia': return 'Sepolia Etherscan';
            case 'base-sepolia': return 'Base Sepolia Explorer';
            case 'ethereum': return 'Etherscan';
            case 'base': return 'Base Explorer';
            default: return 'Blockchain Explorer';
        }
    }
    
    getExplorerUrl(network, txHash) {
        const baseUrls = {
            'ethereum-sepolia': 'https://sepolia.etherscan.io',
            'base-sepolia': 'https://sepolia.basescan.org',
            'ethereum': 'https://etherscan.io',
            'base': 'https://basescan.org'
        };
        
        const baseUrl = baseUrls[network] || 'https://etherscan.io';
        return `${baseUrl}/tx/${txHash}`;
    }

    updateCCTPStep(data) {
        const workflowCard = document.querySelector(`[data-workflow-id="${data.workflow_id}"]`);
        if (!workflowCard) return;

        const step = workflowCard.querySelector(`[data-step-id="${data.step_id}"]`);
        if (!step) return;

        // Update step class based on status  
        const statusClass = data.status === 'in_progress' ? 'executing' : 
                           data.status === 'completed' ? 'completed' : 
                           data.status === 'failed' ? 'failed' : 'pending';
        step.className = `workflow-step ${statusClass}`;
        
        // Update step status text and message
        const stepStatus = step.querySelector('.step-status');
        const stepMessage = step.querySelector('.step-message');
        
        if (stepStatus) {
            stepStatus.textContent = this.getStepStatusText(data.status);
            stepStatus.className = `step-status ${statusClass}`;
        }
        
        if (stepMessage) {
            stepMessage.textContent = data.message || this.getStepMessage(data.status);
        }

        // Update step content with blockchain links and results
        this.updateStepContent(step, data);
    }
    
    updateStepContent(step, data) {
        const stepContent = step.querySelector('.step-content');
        if (!stepContent) return;
        
        // Clear existing content
        stepContent.innerHTML = '';
        
        if (data.status === 'completed' && data.result) {
            const result = data.result;
            let contentHtml = '';
            
            // Add transaction links with clear labels - show success OR failure, not both
            if (result.transactionHash && result.transactionHash !== 'verification_failed' && result.verified !== false) {
                // SUCCESS CASE - verification actually succeeded
                const network = this.getNetworkFromStepId(data.step_id);
                const explorerName = this.getExplorerName(network);
                const explorerUrl = result.explorerUrl || this.getExplorerUrl(network, result.transactionHash);
                
                // Customize message based on step type
                let transactionType = 'Transaction Confirmed';
                let icon = '✅';
                if (data.step_id === 'onchain_verification') {
                    transactionType = 'Proof Verified On-Chain';
                    icon = '🔗';
                } else if (data.step_id === 'usdc_burn') {
                    transactionType = 'USDC Burn Confirmed';
                    icon = '🔥';
                } else if (data.step_id === 'usdc_mint') {
                    transactionType = 'USDC Mint Confirmed';
                    icon = '🪙';
                }
                
                contentHtml += `
                    <div class="blockchain-status confirmed" style="margin-top: 12px; padding: 8px 12px; border-left: 4px solid #10b981; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12px; color: #10b981; font-weight: 600; margin-bottom: 2px;">
                                    ${icon} ${transactionType}
                                </div>
                                <div style="font-size: 11px; color: #9ca3af;">
                                    ${result.transactionHash.substring(0, 20)}...${result.transactionHash.slice(-8)}
                                </div>
                            </div>
                            <a href="${explorerUrl}" target="_blank" class="blockchain-link" 
                               style="color: #8b9aff; text-decoration: none; font-size: 11px; font-weight: 600; 
                                      padding: 4px 8px; border-radius: 3px;
                                      border: 1px solid rgba(139, 154, 255, 0.2); transition: all 0.2s ease;">
                                📄 View on ${explorerName}
                            </a>
                        </div>
                    </div>
                `;
            } else if (data.step_id === 'onchain_verification' && (result.transactionHash === 'verification_failed' || result.verified === false)) {
                // Show blockchain explorer link even for failed verification
                const network = this.getNetworkFromStepId(data.step_id);
                const explorerName = this.getExplorerName(network);
                const verifierAddress = network === 'ethereum-sepolia' ? '0x09378444046d1ccb32ca2d5b44fab6634738d067' : '0x74D68B2481d298F337e62efc50724CbBA68dCF8f';
                const baseUrl = network === 'ethereum-sepolia' ? 'https://sepolia.etherscan.io' : 'https://sepolia.basescan.org';
                const contractUrl = `${baseUrl}/address/${verifierAddress}`;
                
                contentHtml += `
                    <div class="blockchain-status warning" style="margin-top: 12px; padding: 8px 12px; border-left: 4px solid #fbbf24; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12px; color: #fbbf24; font-weight: 600; margin-bottom: 2px;">
                                    ⚠️ Verification Failed
                                </div>
                                <div style="font-size: 11px; color: #9ca3af;">
                                    On-chain proof verification could not complete
                                </div>
                            </div>
                            <a href="${contractUrl}" target="_blank" class="blockchain-link" 
                               style="color: #8b9aff; text-decoration: none; font-size: 11px; font-weight: 600; 
                                      padding: 4px 8px; border-radius: 3px;
                                      border: 1px solid rgba(139, 154, 255, 0.2); transition: all 0.2s ease;">
                                📄 View Contract on ${explorerName}
                            </a>
                        </div>
                    </div>
                `;
            }
            
            // Add specific step result content with dark backgrounds
            if (result.proofId) {
                contentHtml += `
                    <div class="blockchain-status success" style="margin-top: 8px; padding: 6px 10px; border-left: 3px solid #10b981; border-radius: 3px;">
                        <div style="font-size: 12px;">
                            <span style="color: #8b9aff;">✅ Proof generated:</span> 
                            <span style="color: #10b981; font-weight: 500;">${result.proofId}</span>
                        </div>
                    </div>
                `;
            }
            
            if (result.burnedAmount) {
                contentHtml += `
                    <div class="blockchain-status warning" style="margin-top: 6px; padding: 6px 10px; border-left: 3px solid #fbbf24; border-radius: 3px;">
                        <div style="font-size: 12px;">
                            <span style="color: #8b9aff;">🔥 Burned:</span> 
                            <span style="color: #fbbf24; font-weight: 500;">${result.burnedAmount} USDC</span>
                        </div>
                    </div>
                `;
            }
            
            // Note: verification details are already shown in the main transaction section above
            // This avoids duplicate display of verification information
            
            if (result.received && data.step_id === 'circle_attestation') {
                contentHtml += `
                    <div class="blockchain-status success" style="margin-top: 6px; padding: 6px 10px; border-left: 3px solid #10b981; border-radius: 3px;">
                        <div style="font-size: 12px;">
                            <span style="color: #8b9aff;">📡 Attestation:</span> 
                            <span style="color: #10b981; font-weight: 500;">Circle CCTP confirmed</span>
                        </div>
                    </div>
                `;
            }
            
            stepContent.innerHTML = contentHtml;
        }
    }
    
    getNetworkFromStepId(stepId) {
        // Determine network based on step ID
        switch (stepId) {
            case 'zkp_authorization':
            case 'onchain_verification': 
            case 'usdc_burn':
                return 'ethereum-sepolia'; // Source network
            case 'usdc_mint':
                return 'base-sepolia'; // Destination network
            default:
                return 'ethereum-sepolia';
        }
    }

    formatStepResult(stepId, result) {
        switch (stepId) {
            case 'zkp_authorization':
                return `<span class="success">✅ Proof generated: ${result.proofId}</span>`;
            case 'onchain_verification':
                const network = this.getNetworkFromStepId(stepId);
                const explorerName = this.getExplorerName(network);
                const contractLink = `<a href="https://sepolia.etherscan.io/address/0x09378444046d1ccb32ca2d5b44fab6634738d067" target="_blank" class="contract-link" title="View Ethereum Verifier Contract">📄 View on ${explorerName}</a>`;
                return `<span class="success">✅ Verified on-chain: <a href="${result.explorerUrl}" target="_blank" title="View transaction on ${explorerName}">${result.transactionHash?.substring(0, 10)}...</a> ${contractLink}</span>`;
            case 'usdc_burn':
                const burnNetwork = this.getNetworkFromStepId(stepId);
                const burnExplorerName = this.getExplorerName(burnNetwork);
                return `<span class="success">✅ USDC burned: <a href="${result.explorerUrl}" target="_blank" title="View burn transaction on ${burnExplorerName}">${result.transactionHash?.substring(0, 10)}...</a></span>`;
            case 'circle_attestation':
                return `<span class="success">✅ Circle CCTP attestation received</span>`;
            case 'usdc_mint':
                const mintNetwork = this.getNetworkFromStepId(stepId);
                const mintExplorerName = this.getExplorerName(mintNetwork);
                return `<span class="success">✅ USDC minted: <a href="${result.explorerUrl}" target="_blank" title="View mint transaction on ${mintExplorerName}">${result.transactionHash?.substring(0, 10)}...</a></span>`;
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
}

.cctp-header {
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
    border-style: solid;
    border-color: rgba(156, 163, 175, 0.4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.cctp-step.in_progress {
    border-color: #fbbf24;
    border-style: solid;
    animation: pulseGlow 2s ease-in-out infinite;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2), 
                0 8px 24px rgba(251, 191, 36, 0.4),
                inset 0 0 20px rgba(251, 191, 36, 0.08);
}

.cctp-step.completed {
    border-color: #10b981;
    border-style: solid;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), 
                0 4px 16px rgba(16, 185, 129, 0.3),
                inset 0 0 20px rgba(16, 185, 129, 0.08);
}

.cctp-step.failed {
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
    transition: all 0.2s ease;
}

.contract-link:hover {
    color: #0052FF;
}
`;