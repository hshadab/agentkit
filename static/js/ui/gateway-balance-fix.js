/**
 * Gateway Balance Fix - Handle locked funds issue in Circle Gateway
 */

export class GatewayBalanceFix {
    constructor() {
        this.apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
        this.baseUrl = 'https://gateway-api-testnet.circle.com/v1';
    }
    
    /**
     * Check if funds are locked and provide fix instructions
     */
    async diagnoseFundsIssue(userAddress) {
        console.log('🔬 Diagnosing Gateway funds issue...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
        
        const balancePayload = {
            token: "USDC",
            sources: [
                { domain: 0, depositor: userAddress },  // Ethereum Sepolia
                { domain: 1, depositor: userAddress },  // Avalanche Fuji
                { domain: 6, depositor: userAddress }   // Base Sepolia
            ]
        };
        
        try {
            const response = await fetch(`${this.baseUrl}/balances`, {
                method: 'POST',
                headers,
                body: JSON.stringify(balancePayload)
            });
            
            const balanceData = await response.json();
            
            let totalDeposited = 0;
            let totalAvailable = 0;
            let lockedChains = [];
            
            balanceData.balances?.forEach(balance => {
                const deposited = parseFloat(balance.balance || 0);
                const available = parseFloat(balance.available || 0);
                
                totalDeposited += deposited;
                totalAvailable += available;
                
                if (deposited > 0 && available === 0) {
                    const chainNames = {
                        0: 'Ethereum Sepolia',
                        1: 'Avalanche Fuji', 
                        6: 'Base Sepolia'
                    };
                    lockedChains.push({
                        chain: chainNames[balance.domain] || `Domain ${balance.domain}`,
                        domain: balance.domain,
                        locked: deposited
                    });
                }
            });
            
            const diagnosis = {
                totalDeposited,
                totalAvailable,
                hasLockedFunds: lockedChains.length > 0,
                lockedChains,
                canTransfer: totalAvailable > 0,
                issue: totalDeposited > 0 && totalAvailable === 0 ? 'FUNDS_LOCKED' : 
                       totalAvailable > 0 ? 'FUNDS_AVAILABLE' : 'NO_FUNDS'
            };
            
            console.log('💰 Balance Diagnosis:', diagnosis);
            return diagnosis;
            
        } catch (error) {
            console.error('❌ Diagnosis failed:', error);
            return {
                error: error.message,
                issue: 'DIAGNOSIS_FAILED'
            };
        }
    }
    
    /**
     * Show user-friendly fix instructions for locked funds
     */
    showFixInstructions(diagnosis, userAddress) {
        if (diagnosis.issue !== 'FUNDS_LOCKED') {
            return null; // No fix needed
        }
        
        const instructions = {
            title: '🚨 Funds Locked in Gateway',
            problem: `You have ${diagnosis.totalDeposited.toFixed(2)} USDC deposited but 0.00 USDC available for transfers.`,
            cause: 'Circle Gateway requires funds to be marked as "available" to enable transfers.',
            solutions: [
                {
                    title: '✅ Recommended: Use Circle Faucet',
                    steps: [
                        'Go to https://faucet.circle.com/',
                        `Enter your wallet: ${userAddress}`,
                        'Select "Sepolia" network',
                        'Request fresh testnet USDC',
                        'Wait for confirmation',
                        'Check that balance shows as "available"'
                    ],
                    note: 'This creates properly available funds for Gateway transfers'
                },
                {
                    title: '🔧 Alternative: Contract Interaction',
                    steps: [
                        'Connect MetaMask to Sepolia testnet',
                        'Interact with Gateway contract: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
                        'Call deposit function with correct parameters',
                        'Ensure transaction completes fully'
                    ],
                    note: 'More technical but may unlock existing deposits'
                },
                {
                    title: '🆕 Fresh Start: New Wallet',
                    steps: [
                        'Create a new wallet address',
                        'Fund directly with Circle faucet',
                        'Test Gateway transfers immediately'
                    ],
                    note: 'Guaranteed to work with clean slate'
                }
            ]
        };
        
        return instructions;
    }
    
    /**
     * Display fix instructions in the UI
     */
    displayFixUI(instructions, containerId = 'gateway-balance-fix') {
        if (!instructions) return;
        
        const container = document.getElementById(containerId) || document.body;
        
        const fixElement = document.createElement('div');
        fixElement.className = 'gateway-balance-fix';
        fixElement.innerHTML = `
            <div class="fix-header">
                <h3>${instructions.title}</h3>
                <p class="problem">${instructions.problem}</p>
                <p class="cause">${instructions.cause}</p>
            </div>
            <div class="fix-solutions">
                ${instructions.solutions.map((solution, index) => `
                    <div class="solution-option" data-option="${index}">
                        <h4>${solution.title}</h4>
                        <ol class="solution-steps">
                            ${solution.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                        <p class="solution-note">${solution.note}</p>
                    </div>
                `).join('')}
            </div>
            <div class="fix-actions">
                <button class="btn-primary" onclick="window.open('https://faucet.circle.com/', '_blank')">
                    🚰 Open Circle Faucet
                </button>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.remove()">
                    ❌ Dismiss
                </button>
            </div>
        `;
        
        // Add styles
        const styles = `
            <style>
            .gateway-balance-fix {
                background: linear-gradient(135deg, #fef3c7, #fbbf24);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 16px 0;
                color: #92400e;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .fix-header h3 {
                margin: 0 0 10px 0;
                color: #dc2626;
            }
            .problem {
                font-weight: 600;
                margin: 8px 0;
            }
            .cause {
                font-style: italic;
                margin: 8px 0 16px 0;
            }
            .solution-option {
                background: rgba(255, 255, 255, 0.7);
                border-radius: 8px;
                padding: 15px;
                margin: 12px 0;
            }
            .solution-steps {
                margin: 10px 0;
                padding-left: 20px;
            }
            .solution-note {
                font-style: italic;
                font-size: 0.9em;
                color: #059669;
                margin-top: 8px;
            }
            .fix-actions {
                display: flex;
                gap: 12px;
                margin-top: 16px;
            }
            .btn-primary, .btn-secondary {
                padding: 10px 16px;
                border-radius: 6px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-primary {
                background: #059669;
                color: white;
            }
            .btn-primary:hover {
                background: #047857;
            }
            .btn-secondary {
                background: #6b7280;
                color: white;
            }
            .btn-secondary:hover {
                background: #4b5563;
            }
            </style>
        `;
        
        if (!document.querySelector('#gateway-balance-fix-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'gateway-balance-fix-styles';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }
        
        container.appendChild(fixElement);
        
        // Scroll to fix instructions
        fixElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    /**
     * Integrate with existing Gateway workflow
     */
    async checkAndDisplayFix(userAddress, workflowId) {
        const diagnosis = await this.diagnoseFundsIssue(userAddress);
        
        if (diagnosis.issue === 'FUNDS_LOCKED') {
            const instructions = this.showFixInstructions(diagnosis, userAddress);
            
            // Find the gateway workflow card and add fix instructions
            const workflowCard = document.querySelector(`[data-workflow-id="${workflowId}"]`);
            if (workflowCard) {
                this.displayFixUI(instructions, workflowCard.id || workflowCard);
            } else {
                this.displayFixUI(instructions);
            }
            
            // Also log to console for debugging
            console.log('🚨 GATEWAY FUNDS LOCKED:', diagnosis);
            console.log('💡 Fix instructions displayed in UI');
            
            return { needsFix: true, instructions };
        }
        
        return { needsFix: false, diagnosis };
    }
}

// Make available globally
window.GatewayBalanceFix = GatewayBalanceFix;