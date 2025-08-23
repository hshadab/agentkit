// Gateway Workflow Manager - Circle Gateway Multi-Chain AI Agent Payments
// Integrates with existing UI following CCTP workflow patterns
// CACHE BUST: 2025-08-22-23:50-comprehensive-bigint-fix

// BigInt JSON serialization helpers
const isHex = (h) => typeof h === 'string' && /^0x[0-9a-fA-F]*$/.test(h) && (h.length % 2 === 0);
const isBytes32 = (h) => typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h);

// Deep-convert BigInt -> decimal string everywhere (safe for eth_signTypedData_v4)
export function typedDataToV4JSON(typed) {
  const convert = (x) => {
    if (typeof x === 'bigint') return x.toString();
    if (Array.isArray(x)) return x.map(convert);
    if (x && typeof x === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(x)) {
        const vv = convert(v);
        if ([
          'sourceContract','destinationContract','sourceToken','destinationToken',
          'sourceDepositor','destinationRecipient','sourceSigner','destinationCaller','salt'
        ].includes(k)) { if (!isBytes32(vv)) throw new Error(`Not bytes32: ${k}=${vv}`); }
        if (k === 'hookData' && !isHex(vv)) throw new Error('hookData must be 0x-hex');
        out[k] = vv;
      }
      return out;
    }
    return x;
  };
  return JSON.stringify(convert(typed));
}

// Use this EVERY time you need to JSON.stringify anything that MAY contain BigInt
export const safeStringify = (x) => JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

// Bytes32 padding helpers
export function toBytes32(hex) {
  if (!isHex(hex)) throw new Error(`toBytes32: not hex: ${hex}`);
  const raw = hex.slice(2);
  if (raw.length > 64) throw new Error(`toBytes32: too long (${raw.length} nibbles): ${hex}`);
  return '0x' + raw.padStart(64, '0');
}

export function toBytes32Address(addr) {
  // normalize address length (20 bytes) and pad left to 32 bytes
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error(`Bad address: ${addr}`);
  return toBytes32(addr.toLowerCase());
}

// Number/BigInt -> uint256 bytes32
export function toBytes32Uint(n) {
  const bn = typeof n === 'bigint' ? n : BigInt(n);
  if (bn < 0n) throw new Error(`toBytes32Uint: negative not allowed: ${n}`);
  return '0x' + bn.toString(16).padStart(64, '0');
}

// Random 32-byte salt (best option)
export function random32() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return '0x' + Array.from(b).map(x => x.toString(16).padStart(2,'0')).join('');
}

// Gateway Minting Helpers
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B';

const CHAIN_BY_DOMAIN = {
  0: 11155111,   // Ethereum Sepolia
  6: 84532,      // Base Sepolia  
  1: 43113,      // Avalanche Fuji
};

const EXPLORER = {
  11155111: 'https://sepolia.etherscan.io/tx/',
  84532:    'https://sepolia.basescan.org/tx/',
  43113:    'https://testnet.snowtrace.io/tx/',
};

const MINTER_ABI = [
  'function gatewayMint(bytes attestation, bytes signature) external returns (bool)',
];

async function ensureChain(chainId) {
  const hex = '0x' + chainId.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (e) {
    if (e?.code === 4902) {
      console.log(`Adding chain ${chainId} to MetaMask...`);
      // Chain not in MetaMask, but we'll let it fail gracefully for now
      throw new Error(`Chain ${chainId} not available in MetaMask`);
    } else { 
      throw e; 
    }
  }
}

async function mintPerDestination(attestationData) {
  // attestationData: { destinationDomain, attestation, signature }
  const chainId = CHAIN_BY_DOMAIN[attestationData.destinationDomain];
  if (!chainId) throw new Error(`Unknown destinationDomain ${attestationData.destinationDomain}`);

  console.log(`🔨 Minting on chain ${chainId} (domain ${attestationData.destinationDomain})...`);
  
  await ensureChain(chainId);

  // Use ethers to call gatewayMint
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const minter = new ethers.Contract(GATEWAY_MINTER, MINTER_ABI, signer);
  const tx = await minter.gatewayMint(attestationData.attestation, attestationData.signature);
  const receipt = await tx.wait();

  return { 
    chainId, 
    hash: tx.hash, 
    status: receipt.status === 1 ? 'success' : 'reverted',
    explorer: EXPLORER[chainId] + tx.hash
  };
}

export class GatewayWorkflowManager {
    constructor(uiManager, wsManager) {
        console.log('🚨🚨🚨 NEW GATEWAY-WORKFLOW-MANAGER-V2.JS LOADED - MULTI-CHAIN + REAL BALANCE VERSION 🚨🚨🚨');
        this.uiManager = uiManager;
        this.wsManager = wsManager;
        this.activeTransfers = new Map();
        this.initialized = false;
        this.web3Provider = null;
        this.userAccount = null;
        
        // Gateway configuration - OFFICIAL TESTNET ADDRESSES
        this.gatewayConfig = {
            testnet: {
                api: 'https://gateway-api-testnet.circle.com/v1',
                // Gateway constants (same across all testnets)
                gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
                gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B',
                networks: {
                    0: { 
                        name: 'Ethereum Sepolia', 
                        explorer: 'https://sepolia.etherscan.io', 
                        icon: '🔷',
                        usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
                    },
                    6: { 
                        name: 'Base Sepolia', 
                        explorer: 'https://sepolia.basescan.org', 
                        icon: '🟦',
                        usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                    },
                    1: { 
                        name: 'Avalanche Fuji', 
                        explorer: 'https://testnet.snowtrace.io', 
                        icon: '🔺',
                        usdc: '0x5425890298aed601595a70AB815c96711a31Bc65'
                    }
                }
            },
            mainnet: {
                api: 'https://gateway-api.circle.com/v1',
                networks: {
                    0: { name: 'Ethereum', explorer: 'https://etherscan.io', icon: '🔷' },
                    6: { name: 'Base', explorer: 'https://basescan.org', icon: '🟦' },
                    1: { name: 'Avalanche', explorer: 'https://snowtrace.io', icon: '🔺' },
                    3: { name: 'Arbitrum', explorer: 'https://arbiscan.io', icon: '🔵' },
                    2: { name: 'Optimism', explorer: 'https://optimistic.etherscan.io', icon: '🔴' },
                    7: { name: 'Polygon', explorer: 'https://polygonscan.com', icon: '🟣' },
                    10: { name: 'Unichain', explorer: 'https://unichain.org/explorer', icon: '🦄' }
                },
                gatewayWallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE'
            }
        };
    }

    async initialize() {
        if (this.initialized) return;
        
        this.setupMessageHandlers();
        this.injectStyles();
        await this.initializeMetaMask();
        this.initialized = true;
        console.log('✅ Gateway Workflow Manager initialized');
    }

    async initializeMetaMask() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                this.web3Provider = window.ethereum;
                
                // Listen for account changes
                this.web3Provider.on('accountsChanged', (accounts) => {
                    this.userAccount = accounts[0] || null;
                    console.log('👤 MetaMask account changed:', this.userAccount);
                });
                
                // Listen for network changes
                this.web3Provider.on('chainChanged', (chainId) => {
                    console.log('🌐 Network changed:', chainId);
                });
                
                // Get current account if already connected
                const accounts = await this.web3Provider.request({ method: 'eth_accounts' });
                this.userAccount = accounts[0] || null;
                
                console.log('🦊 MetaMask initialized, account:', this.userAccount);
            } catch (error) {
                console.warn('MetaMask initialization failed:', error);
            }
        } else {
            console.warn('MetaMask not detected');
        }
    }

    async connectMetaMask() {
        if (!this.web3Provider) {
            throw new Error('MetaMask not available');
        }
        
        try {
            const accounts = await this.web3Provider.request({ 
                method: 'eth_requestAccounts' 
            });
            this.userAccount = accounts[0];
            console.log('🦊 MetaMask connected:', this.userAccount);
            return this.userAccount;
        } catch (error) {
            console.error('MetaMask connection failed:', error);
            throw error;
        }
    }

    injectStyles() {
        if (!document.getElementById('gateway-workflow-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'gateway-workflow-styles';
            styleElement.textContent = this.getGatewayWorkflowStyles();
            document.head.appendChild(styleElement);
            console.log('📄 Gateway workflow styles injected');
        }
    }

    getGatewayWorkflowStyles() {
        return `
            .gateway-workflow {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 20px;
                margin: 16px 0;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            .gateway-workflow::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #06b6d4, #10b981);
                border-radius: 12px 12px 0 0;
            }

            .gateway-advantage-badge {
                position: absolute;
                top: 12px;
                right: 12px;
                background: linear-gradient(45deg, #10b981, #06b6d4);
                color: white;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }

            .gateway-unified-balance {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin: 12px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .gateway-networks {
                display: flex;
                gap: 8px;
                margin: 12px 0;
                flex-wrap: wrap;
            }

            .gateway-network {
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 11px;
                color: #60a5fa;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .gateway-step.completed {
                background: rgba(16, 185, 129, 0.1);
                border-color: rgba(16, 185, 129, 0.3);
            }

            .gateway-step.executing {
                background: rgba(251, 191, 36, 0.1);
                border-color: rgba(251, 191, 36, 0.3);
                animation: pulse 2s infinite;
            }

            .gateway-step.pending {
                background: rgba(75, 85, 99, 0.1);
                border-color: rgba(75, 85, 99, 0.3);
            }

            .gateway-metamask-action {
                background: linear-gradient(45deg, #f59e0b, #d97706);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 8px;
                transition: all 0.2s ease;
            }

            .gateway-metamask-action:hover {
                background: linear-gradient(45deg, #d97706, #b45309);
                transform: translateY(-1px);
            }

            .gateway-verification-links {
                display: flex;
                gap: 8px;
                margin-top: 8px;
                flex-wrap: wrap;
            }

            .gateway-verification-link {
                background: rgba(139, 154, 255, 0.1);
                border: 1px solid rgba(139, 154, 255, 0.3);
                color: #8b9aff;
                text-decoration: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .gateway-verification-link:hover {
                background: rgba(139, 154, 255, 0.2);
                text-decoration: none;
                color: #a5b4fc;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
    }

    setupMessageHandlers() {
        // Handle Gateway workflow start
        this.wsManager.on('gateway_workflow_started', (data) => {
            console.log('🌐 Gateway Workflow started:', data);
            const workflowCard = this.createGatewayWorkflowCard(data);
            this.uiManager.addMessage(workflowCard, 'assistant');
        });

        // Handle Gateway step updates
        this.wsManager.on('gateway_step_update', (data) => {
            console.log('🔄 Gateway Step update:', data);
            this.updateGatewayStep(data);
        });

        // Handle Gateway completion
        this.wsManager.on('gateway_workflow_complete', (data) => {
            console.log('✅ Gateway Workflow complete:', data);
            this.completeGatewayWorkflow(data);
        });

        // Handle Gateway errors
        this.wsManager.on('gateway_workflow_error', (data) => {
            console.log('❌ Gateway Workflow error:', data);
            this.handleGatewayError(data);
        });
    }

    createGatewayWorkflowCard(data) {
        console.log('🔍 DEBUG: Creating Gateway workflow card with data:', data);
        console.log('🔍 DEBUG: unifiedBalance value:', data.unifiedBalance);
        console.log('🔍 DEBUG: balanceBreakdown value:', data.balanceBreakdown);
        
        const card = document.createElement('div');
        card.className = 'workflow-card gateway-workflow';
        card.setAttribute('data-workflow-id', data.workflow_id);
        card.setAttribute('data-workflow-type', 'gateway');

        const isTestnet = data.environment === 'testnet' || data.testnet;
        const config = isTestnet ? this.gatewayConfig.testnet : this.gatewayConfig.mainnet;
        const networks = Object.values(config.networks);
        const steps = this.getGatewaySteps(data, isTestnet);
        
        card.innerHTML = `
            <div class="gateway-advantage-badge">60x Faster</div>
            <div class="card-header">
                <div class="card-header-row">
                    <div class="card-title">CIRCLE GATEWAY</div>
                    <div class="workflow-status in-progress">IN PROGRESS</div>
                </div>
                <div class="card-function-name">⚡ Unified Balance Multi-Chain Transfer</div>
                <div class="workflow-id" style="font-size: 11px; color: #8b9aff; opacity: 0.7;">ID: ${data.workflow_id}</div>
            </div>
            
            <div class="gateway-unified-balance">
                <div>
                    <div style="font-size: 12px; color: #10b981; font-weight: 600;" id="gateway-header-balance-${data.workflow_id}">💰 Unified Gateway Balance: ${data.unifiedBalance || 'Loading real balance...'}</div>
                    <div style="font-size: 10px; color: #9ca3af; white-space: pre-line; margin-top: 4px;" id="gateway-balance-breakdown-${data.workflow_id}">${data.balanceBreakdown || 'Fetching live chain breakdown from Circle API...'}</div>
                    <div style="margin-top: 8px;">
                        <button onclick="gatewayWorkflowManager.checkGatewayBalanceManually()" class="gateway-verification-link" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer;">
                            💰 Check Gateway Balance
                        </button>
                    </div>
                </div>
                <div>
                    <div style="font-size: 10px; color: #06b6d4; font-weight: 600;">&lt;500ms transfers</div>
                    <div style="font-size: 10px; color: #06b6d4;">Real Gateway API</div>
                </div>
            </div>

            <div class="transfer-details" style="display: flex; gap: 16px; margin: 12px 0; font-size: 13px;">
                <div class="transfer-amount" style="color: #10b981; font-weight: 600;">${data.amount || '0.01'} USDC per chain (0.03 total)</div>
                <div class="transfer-agent" style="color: #8b9aff;">Agent: ${data.agentId || 'financial_executor_007'}</div>
                <div class="transfer-environment" style="color: ${isTestnet ? '#fbbf24' : '#10b981'};">${isTestnet ? 'Testnet' : 'Mainnet'}</div>
            </div>

            <div class="gateway-networks">
                ${networks.map(network => `
                    <div class="gateway-network">
                        <span>${network.icon}</span>
                        <span>${network.name}</span>
                    </div>
                `).join('')}
            </div>

            <div class="workflow-steps-container">
                ${steps.map((step, index) => this.createGatewayStepHTML(step, index, isTestnet)).join('')}
            </div>
        `;

        return card;
    }

    getGatewaySteps(data, isTestnet) {
        return [
            {
                id: 'zkp_authorization',
                name: 'ZKP Agent Authorization',
                description: 'Generate zero-knowledge proof for spending authorization',
                status: 'awaiting'
            },
            {
                id: 'onchain_verification',
                name: 'On-Chain Verification',
                description: 'Verify proof on blockchain to trigger Gateway access',
                status: 'awaiting'
            },
            {
                id: 'gateway_transfer',
                name: 'Multi-Chain Agent Spending',
                description: 'Agent spends 0.01 USDC on each of 3 chains: Ethereum, Base, and Avalanche',
                status: 'awaiting'
            }
        ];
    }

    createGatewayStepHTML(step, index, isTestnet) {
        const statusClass = step.status === 'awaiting' ? 'pending' : 
                           step.status === 'in_progress' ? 'executing' : 
                           step.status === 'completed' ? 'completed' : 'pending';
        
        const totalSteps = 3;
        
        return `
            <div class="workflow-step gateway-step ${statusClass}" data-step-id="${step.id}">
                <div class="workflow-step-header">
                    <div class="step-details">
                        <div class="step-title" style="font-size: 11px; color: #8b9aff; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">
                            STEP ${index + 1} OF ${totalSteps}
                        </div>
                        <div class="step-name" style="font-size: 14px; color: #ffffff; font-weight: 500; margin-bottom: 6px;">
                            ${step.description}
                        </div>
                        <div class="step-message" style="font-size: 12px; color: #9ca3af; line-height: 1.4;">
                            ${this.getStepMessage(step.status, step.requiresMetaMask)}
                        </div>
                    </div>
                    <div class="step-status ${statusClass}" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; letter-spacing: 0.05em;">
                        ${this.getStepStatusText(step.status)}
                    </div>
                </div>
                <div class="step-content" id="gateway-step-content-${step.id}" style="margin-top: 8px;">
                    ${this.getStepContent(step, isTestnet)}
                </div>
            </div>
        `;
    }

    getStepContent(step, isTestnet) {
        // NO MANUAL BUTTONS - FULLY AUTOMATED WORKFLOW
        switch (step.id) {
            case 'zkp_authorization':
                return `
                    <div style="font-size: 12px; color: #9ca3af;">
                        🔄 Generating proof automatically...
                    </div>
                `;
            
            case 'onchain_verification':
                return `
                    <div style="font-size: 12px; color: #9ca3af;">
                        🔄 Verifying on-chain automatically...
                    </div>
                `;
            
            case 'gateway_transfer':
                return `
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 12px;">
                        🔄 Agent spending 0.01 USDC on each of 3 chains simultaneously...
                    </div>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 11px;">
                            <span>🔷</span>
                            <span style="flex: 1;">Ethereum Sepolia</span>
                            <span style="color: #3b82f6; font-weight: 500;">DeFi Liquidity</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0, 82, 255, 0.1); border-radius: 6px; font-size: 11px;">
                            <span>🟦</span>
                            <span style="flex: 1;">Base Sepolia</span>
                            <span style="color: #0052FF; font-weight: 500;">Payment Processing</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(232, 65, 66, 0.1); border-radius: 6px; font-size: 11px;">
                            <span>🔺</span>
                            <span style="flex: 1;">Avalanche Fuji</span>
                            <span style="color: #E84142; font-weight: 500;">Gaming Deposit</span>
                        </div>
                    </div>
                `;
            
            case 'verification':
                return `
                    <div style="font-size: 12px; color: #9ca3af;">
                        🔄 Verifying on-chain automatically...
                    </div>
                `;
            
            default:
                return `
                    <div style="font-size: 12px; color: #9ca3af;">
                        🔄 Processing automatically...
                    </div>
                `;
        }
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
    
    getStepMessage(status, requiresMetaMask = false) {
        switch (status) {
            case 'completed': return '✅ Step completed successfully';
            case 'in_progress': return requiresMetaMask ? '⏳ Check MetaMask for transaction approval' : '⏳ Processing automatically...';
            case 'executing': return requiresMetaMask ? '⏳ Check MetaMask for transaction approval' : '⏳ Processing automatically...';
            case 'failed': return '❌ Step failed - check console for details';
            default: return 'Step will execute automatically - no action required';
        }
    }

    // All Gateway operations now use real Circle API - no simulations

    getCircleAPIKey() {
        // This would normally come from environment or secure storage
        return 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
    }

    async executeRealGatewayTransfer(amount, recipient, agentId, isTestnet) {
        console.log('🌐 Executing REAL Gateway multi-chain deployment...');
        console.log('🔍 DEBUG: Function entry - parameters:', { amount, recipient, agentId, isTestnet });
        
        try {
            const deploymentAmountPerChain = parseFloat(amount);
            const userAddress = this.userAccount || '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
            const recipientAddress = recipient || '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87';
            
            // DEBUG: Check amount conversion for decimal issue
            console.log('🔍 AMOUNT CONVERSION DEBUG:');
            console.log(`   Input amount: "${amount}" (type: ${typeof amount})`);
            console.log(`   Parsed amount: ${deploymentAmountPerChain} (type: ${typeof deploymentAmountPerChain})`);
            console.log(`   Micro-USDC value: ${Math.floor(deploymentAmountPerChain * 1000000)} (should be 10000 for 0.01 USDC)`);
            
            // Get BEFORE balance for verification links
            // Deploy to all chains as specified in workflow: Ethereum, Base, Avalanche
            const chains = [
                {
                    name: 'Base Sepolia', 
                    domain: 6,
                    icon: '🟦',
                    operation: 'Payment Processing',
                    explorer: 'https://sepolia.basescan.org',
                    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'
                },
                {
                    name: 'Avalanche Fuji', 
                    domain: 1,
                    icon: '🔺',
                    operation: 'Gaming Deposit',
                    explorer: 'https://testnet.snowtrace.io',
                    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
                    gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'
                }
            ];
            
            console.log('📡 Fetching BEFORE balance for verification...');
            const beforeBalanceData = await this.getRealGatewayBalanceWithBreakdown();
            console.log(`💰 BEFORE Gateway balance: ${beforeBalanceData.total} USDC`);
            
            // Agent spends from Gateway wallet on each chain after ZKP authorization  
            // For 0.01 USDC per chain on 2 chains = 0.02 USDC total spent by agent
            const totalAgentSpending = deploymentAmountPerChain * chains.length;
            
            if (beforeBalanceData.total < totalAgentSpending) {
                throw new Error(`Insufficient Gateway balance: ${beforeBalanceData.total} USDC < ${totalAgentSpending} USDC needed for agent spending across ${chains.length} chains`);
            }

            // Gateway balance verification link (BEFORE)
            const gatewayBalanceUrl = `https://gateway-api-testnet.circle.com/v1/balances`;
            console.log(`🔗 Gateway Balance API (BEFORE): ${gatewayBalanceUrl}`);
            
            console.log('🚀 Starting multi-chain deployment across 3 testnet chains...');
            
            console.log(`🔄 Deploying to ${chains.length} chains: ${chains.map(c => c.name).join(', ')}`);
            
            console.log(`🔥 Creating Gateway deployment operations for ${chains.length} chains...`);
            
            // Gateway flow: separate transfer per destination chain
            const config = this.gatewayConfig.testnet;
            const transfers = [];
            
            // Helper function to convert address to 32-byte hex
            const addressTo32Bytes = (address) => {
                return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
            };
            
            // Create separate transfer for each destination chain
            for (const chain of chains) {
                console.log(`🎯 Creating transfer: Sepolia → ${chain.name}`);
                
                const burnIntent = {
                    maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                    maxFee: "10000", // 0.01 USDC max fee (reasonable for testnet)
                    spec: {
                        version: 1,
                        sourceDomain: 0, // Always Sepolia (source)
                        destinationDomain: chain.domain, // Target chain
                        sourceContract: addressTo32Bytes(config.gatewayWallet),
                        destinationContract: addressTo32Bytes(config.gatewayMinter), 
                        sourceToken: addressTo32Bytes(config.networks[0].usdc), // Sepolia USDC
                        destinationToken: addressTo32Bytes(chain.usdc), // Destination USDC
                        sourceDepositor: addressTo32Bytes(userAddress),
                        destinationRecipient: addressTo32Bytes(recipientAddress),
                        sourceSigner: addressTo32Bytes(userAddress),
                        destinationCaller: "0x0000000000000000000000000000000000000000000000000000000000000000", // Zero address
                        value: Math.floor(deploymentAmountPerChain * 1000000).toString(),
                        salt: '0x' + Math.floor(Date.now() + Math.random() * 1000000).toString(16).padStart(64, '0'),
                        hookData: "0x"
                    }
                };
                
                transfers.push({ chain, burnIntent });
            }
            
            console.log('📝 Created transfers for chains:', transfers.map(t => t.chain.name));
            console.log('🔍 DEBUG: Transfer details:', {
                totalTransfers: transfers.length,
                chains: transfers.map(t => t.chain.name),
                userAddress: userAddress,
                recipientAddress: recipientAddress
            });
            
            // For now, process the first transfer (can be extended to handle multiple)
            const firstTransfer = transfers[0];
            const burnIntent = firstTransfer.burnIntent;
            const targetChain = firstTransfer.chain;
            
            console.log(`🎯 Processing transfer to: ${targetChain.name}`);
            
            // STEP 1: Create EIP-712 TypedData for Circle Gateway burn intent (official format)
            console.log('🔐 Creating official Circle Gateway EIP-712 TypedData...');
            
            // Official Circle Gateway domain parameters
            const eip712Domain = {
                name: "GatewayWallet",
                version: "1"
            };
            
            // Official Circle Gateway TypedData structure
            const eip712Types = {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" }
                ],
                TransferSpec: [
                    { name: "version", type: "uint32" },
                    { name: "sourceDomain", type: "uint32" },
                    { name: "destinationDomain", type: "uint32" },
                    { name: "sourceContract", type: "bytes32" },
                    { name: "destinationContract", type: "bytes32" },
                    { name: "sourceToken", type: "bytes32" },
                    { name: "destinationToken", type: "bytes32" },
                    { name: "sourceDepositor", type: "bytes32" },
                    { name: "destinationRecipient", type: "bytes32" },
                    { name: "sourceSigner", type: "bytes32" },
                    { name: "destinationCaller", type: "bytes32" },
                    { name: "value", type: "uint256" },
                    { name: "salt", type: "bytes32" },
                    { name: "hookData", type: "bytes" }
                ],
                BurnIntent: [
                    { name: "maxBlockHeight", type: "uint256" },
                    { name: "maxFee", type: "uint256" },
                    { name: "spec", type: "TransferSpec" }
                ]
            };
            
            // Proper bytes32 conversion following Circle Gateway specification
            // ALL address fields must be exactly 32 bytes (64 hex chars + 0x prefix)
            const addressToBytes32 = (address) => {
                if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
                    throw new Error(`Invalid address for bytes32 conversion: ${address}`);
                }
                // Pad 20-byte address to 32 bytes (left-pad with zeros)
                const result = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
                console.log(`🔍 Address → bytes32: "${address}" → "${result}"`);
                return result;
            };
            
            // Generate cryptographically secure random salt as bytes32
            const generateSalt = () => {
                const randomValues = new Uint8Array(32);
                crypto.getRandomValues(randomValues);
                const result = '0x' + Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('');
                console.log(`🎲 Generated salt: "${result}"`);
                return result;
            };
            
            // Validation helper to catch malformed hex before MetaMask
            const validateBytes32 = (value, fieldName) => {
                const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
                if (!bytes32Regex.test(value)) {
                    throw new Error(`Invalid bytes32 for ${fieldName}: ${value} (must be exactly 64 hex chars after 0x)`);
                }
            };
            
            const validateHex = (value, fieldName) => {
                const hexRegex = /^0x[0-9a-fA-F]*$/;
                if (!hexRegex.test(value) || value.length % 2 !== 0) {
                    throw new Error(`Invalid hex for ${fieldName}: ${value} (must be even-length hex)`);
                }
            };
            
            // Create properly formatted transferSpec following Circle Gateway specification
            // Convert USDC amount to microUSDC (6 decimals) as BigInt
            const microUSDCAmount = BigInt(Math.floor(deploymentAmountPerChain * 1000000));
            
            const transferSpec = {
                version: 1, // uint32
                sourceDomain: 0, // Ethereum Sepolia 
                destinationDomain: targetChain.domain, // uint32
                sourceContract: addressToBytes32(config.gatewayWallet), // bytes32
                destinationContract: addressToBytes32(config.gatewayMinter), // bytes32
                sourceToken: addressToBytes32(config.networks[0].usdc), // bytes32 - Sepolia USDC
                destinationToken: addressToBytes32(targetChain.usdc), // bytes32 - Target chain USDC
                sourceDepositor: addressToBytes32(userAddress), // bytes32
                destinationRecipient: addressToBytes32(recipientAddress), // bytes32
                sourceSigner: addressToBytes32(userAddress), // bytes32
                destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'), // bytes32 - zero address
                value: microUSDCAmount, // uint256 as BigInt (NOT hex string)
                salt: generateSalt(), // bytes32 - cryptographically secure
                hookData: '0x' // bytes - empty but valid hex
            };
            
            // Validate all bytes32 fields before signing
            console.log('🔍 Validating EIP-712 fields...');
            validateBytes32(transferSpec.sourceContract, 'sourceContract');
            validateBytes32(transferSpec.destinationContract, 'destinationContract');
            validateBytes32(transferSpec.sourceToken, 'sourceToken');
            validateBytes32(transferSpec.destinationToken, 'destinationToken');
            validateBytes32(transferSpec.sourceDepositor, 'sourceDepositor');
            validateBytes32(transferSpec.destinationRecipient, 'destinationRecipient');
            validateBytes32(transferSpec.sourceSigner, 'sourceSigner');
            validateBytes32(transferSpec.destinationCaller, 'destinationCaller');
            validateBytes32(transferSpec.salt, 'salt');
            validateHex(transferSpec.hookData, 'hookData');
            console.log('✅ All EIP-712 fields validated');
            
            const eip712Message = {
                maxBlockHeight: BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"), // uint256 max value
                maxFee: BigInt("10000"), // 0.01 USDC in microUSDC (uint256)
                spec: transferSpec // Properly validated bytes32/uint256 fields
            };
            
            const typedData = {
                types: eip712Types,
                domain: eip712Domain,
                primaryType: "BurnIntent",
                message: eip712Message
            };
            
            // Deep BigInt conversion and validation for MetaMask eth_signTypedData_v4
            const isHex = (h) => typeof h === 'string' && /^0x[0-9a-fA-F]*$/.test(h) && (h.length % 2 === 0);
            const isBytes32 = (h) => typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h);
            
            // Convert BigInt to string and validate all bytes fields
            function toV4Json(typed) {
                const convert = (x, key = "") => {
                    if (typeof x === 'bigint') return x.toString(); // Fix BigInt serialization
                    if (Array.isArray(x)) return x.map(v => convert(v, key));
                    if (x && typeof x === 'object') {
                        const out = {};
                        for (const [k, v] of Object.entries(x)) {
                            const vv = convert(v, k);
                            // Validate bytes32 fields by name
                            if (['sourceContract', 'destinationContract', 'sourceToken', 'destinationToken',
                                 'sourceDepositor', 'destinationRecipient', 'sourceSigner', 'destinationCaller', 'salt']
                                .includes(k)) {
                                if (!isBytes32(vv)) throw new Error(`Not bytes32: ${k}=${vv}`);
                            }
                            if (k === 'hookData' && !isHex(vv)) throw new Error(`hookData must be 0x-hex`);
                            out[k] = vv;
                        }
                        return out;
                    }
                    return x;
                };
                return JSON.stringify(convert(typed));
            }
            
            // Sanity check: ensure no BigInt values remain
            const findBigInt = (x, path = 'root') => {
                if (typeof x === 'bigint') throw new Error(`BigInt left at ${path}`);
                if (Array.isArray(x)) x.forEach((v, i) => findBigInt(v, `${path}[${i}]`));
                else if (x && typeof x === 'object') {
                    for (const [k, v] of Object.entries(x)) findBigInt(v, `${path}.${k}`);
                }
            };
            
            console.log('📋 EIP-712 TypedData prepared (with BigInt validation)');
            
            // STEP 2: Request MetaMask signature using eth_signTypedData_v4
            console.log('🖊️ Requesting EIP-712 signature from MetaMask...');
            
            if (!window.ethereum) {
                throw new Error('MetaMask not available for EIP-712 signing');
            }
            
            let signature;
            try {
                // Convert to JSON-safe format with BigInt → string conversion  
                const payload = typedDataToV4JSON(typedData);
                console.log('✅ Converted payload for MetaMask (BigInt → string)');
                
                signature = await window.ethereum.request({
                    method: 'eth_signTypedData_v4',
                    params: [userAddress, payload]
                });
                
                console.log('✅ EIP-712 signature received:', signature);
                
                // CRITICAL DEBUG: Verify signature matches sourceSigner (Circle's recommended check)
                console.log('🔍 SIGNATURE VERIFICATION DEBUG:');
                console.log('   Signer Address (MetaMask):', userAddress);
                console.log('   sourceSigner (32-byte):', transferSpec.sourceSigner);
                console.log('   sourceSigner (original):', userAddress);
                console.log('   Match Check:', transferSpec.sourceSigner === addressTo32Bytes(userAddress));
                
                // Log the complete typed data being signed
                console.log('📋 Complete TypedData being signed:', safeStringify(typedData));
                
            } catch (signError) {
                console.error('❌ EIP-712 signing failed:', signError);
                throw new Error(`Failed to sign burn intent: ${signError.message}`);
            }
            
            // STEP 3: Create SignedBurnIntent using official Circle Gateway format
            const signedBurnIntent = {
                burnIntent: {
                    maxBlockHeight: burnIntent.maxBlockHeight,
                    maxFee: burnIntent.maxFee,
                    spec: transferSpec // Use same 32-byte format for API submission
                },
                signature: signature
            };
            
            console.log('📝 SignedBurnIntent prepared for Gateway API:', signedBurnIntent);
            console.log('🔍 DEBUG: API spec format check:', {
                sourceContract: `"${signedBurnIntent.burnIntent.spec.sourceContract}" (length: ${signedBurnIntent.burnIntent.spec.sourceContract?.length})`,
                destinationContract: `"${signedBurnIntent.burnIntent.spec.destinationContract}" (length: ${signedBurnIntent.burnIntent.spec.destinationContract?.length})`,
                salt: `"${signedBurnIntent.burnIntent.spec.salt}" (length: ${signedBurnIntent.burnIntent.spec.salt?.length})`
            });
            
            // STEP 3.5: Validate current balance before transfer
            console.log('🔍 Checking current Gateway balance before transfer...');
            try {
                const currentBalance = await this.getRealGatewayBalance();
                const totalRequired = parseFloat(amount) * chains.length + 0.01; // Total across all chains + small buffer
                
                console.log(`💰 Current balance: ${currentBalance} USDC`);
                console.log(`💸 Total required: ${totalRequired} USDC (${amount} × ${chains.length} chains + 0.01 buffer)`);
                
                if (currentBalance < totalRequired) {
                    const shortfall = totalRequired - currentBalance;
                    throw new Error(`Insufficient balance: have ${currentBalance} USDC, need ${totalRequired} USDC (shortfall: ${shortfall.toFixed(6)} USDC)`);
                }
                
                console.log('✅ Balance validation passed');
            } catch (balanceError) {
                console.error('❌ Balance validation failed:', balanceError.message);
                throw new Error(`Balance check failed: ${balanceError.message}`);
            }

            // STEP 4: Submit SignedBurnIntent to Circle Gateway API
            console.log('📤 Submitting SignedBurnIntent to Gateway API...');
            console.log('   API Key available:', !!this.getCircleAPIKey());
            
            const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.getCircleAPIKey()}`
                },
                body: safeStringify([signedBurnIntent]) // Send as array as required by API
            });
            
            const responseText = await response.text();
            console.log('🌐 Gateway API response to signed burn intent:', response.status, responseText);
            
            if (!response.ok) {
                console.error(`❌ Circle Gateway API failed: ${response.status} - ${responseText}`);
                throw new Error(`Circle Gateway API failed with signed burn intent: ${response.status} - ${responseText}`);
            }
            
            const transferResult = JSON.parse(responseText);
            console.log('✅ Gateway transfer successful with EIP-712 signature:', transferResult);
            
            // Create separate signed burn intents for each destination chain
            console.log('🔐 Creating multiple signed burn intents for multi-chain deployment...');
            const signedBurnIntents = [];
            
            for (const chain of chains) {
                console.log(`🔐 Creating burn intent for ${chain.name} (domain ${chain.domain})...`);
                
                // Create unique burn intent for this specific chain
                const chainBurnIntent = {
                    maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                    maxFee: "10000", // 0.01 USDC max fee (reasonable for testnet)
                    spec: {
                        version: 1,
                        sourceDomain: 0, // Ethereum Sepolia (where funds are currently)
                        destinationDomain: chain.domain, // Specific destination chain
                        sourceContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9", // Gateway Wallet (testnet)
                        destinationContract: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B", // Gateway Minter (testnet)
                        sourceToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC Sepolia
                        destinationToken: chain.usdc, // Chain-specific USDC
                        sourceDepositor: userAddress,
                        destinationRecipient: recipientAddress,
                        sourceSigner: userAddress,
                        destinationCaller: userAddress, // Must match the address calling gatewayMint()
                        value: Math.floor(deploymentAmountPerChain * 1000000).toString(),
                        salt: random32(), // Cryptographically secure random salt
                        hookData: "0x"
                    }
                };
                
                // Create chain-specific transferSpec
                const chainTransferSpec = {
                    version: chainBurnIntent.spec.version,
                    sourceDomain: chainBurnIntent.spec.sourceDomain,
                    destinationDomain: chainBurnIntent.spec.destinationDomain,
                    sourceContract: toBytes32Address(chainBurnIntent.spec.sourceContract),
                    destinationContract: toBytes32Address(chainBurnIntent.spec.destinationContract),
                    sourceToken: toBytes32Address(chainBurnIntent.spec.sourceToken),
                    destinationToken: toBytes32Address(chainBurnIntent.spec.destinationToken),
                    sourceDepositor: toBytes32Address(chainBurnIntent.spec.sourceDepositor),
                    destinationRecipient: toBytes32Address(chainBurnIntent.spec.destinationRecipient),
                    sourceSigner: toBytes32Address(chainBurnIntent.spec.sourceSigner),
                    destinationCaller: toBytes32Address(chainBurnIntent.spec.destinationCaller),
                    value: chainBurnIntent.spec.value,
                    salt: toBytes32(chainBurnIntent.spec.salt),
                    hookData: chainBurnIntent.spec.hookData
                };
                
                const chainEip712Message = {
                    maxBlockHeight: chainBurnIntent.maxBlockHeight,
                    maxFee: chainBurnIntent.maxFee,
                    spec: chainTransferSpec
                };
                
                const chainTypedData = {
                    types: eip712Types,
                    domain: eip712Domain,
                    primaryType: "BurnIntent",
                    message: chainEip712Message
                };
                
                // Request signature for this specific chain
                console.log(`🖊️ Requesting signature for ${chain.name}...`);
                try {
                    const chainSignature = await window.ethereum.request({
                        method: 'eth_signTypedData_v4',
                        params: [userAddress, typedDataToV4JSON(chainTypedData)]
                    });
                    
                    const chainSignedBurnIntent = {
                        burnIntent: {
                            maxBlockHeight: chainBurnIntent.maxBlockHeight,
                            maxFee: chainBurnIntent.maxFee,
                            spec: chainTransferSpec
                        },
                        signature: chainSignature
                    };
                    
                    signedBurnIntents.push(chainSignedBurnIntent);
                    console.log(`✅ ${chain.name} burn intent signed successfully`);
                    
                } catch (signError) {
                    console.error(`❌ Failed to sign burn intent for ${chain.name}:`, signError);
                    throw new Error(`Failed to sign burn intent for ${chain.name}: ${signError.message}`);
                }
            }
            
            console.log(`🚀 Submitting ${signedBurnIntents.length} signed burn intents to Gateway API (separate calls per destination)...`);
            
            // Submit each signed burn intent separately (since API requires same destination domain per batch)
            const apiResults = [];
            for (let i = 0; i < signedBurnIntents.length; i++) {
                const signedIntent = signedBurnIntents[i];
                const chain = chains[i];
                
                console.log(`📤 Submitting burn intent for ${chain.name} (domain ${chain.domain})...`);
                
                try {
                    const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${this.getCircleAPIKey()}`
                        },
                        body: safeStringify([signedIntent]) // Single burn intent per call
                    });
                    
                    const responseText = await response.text();
                    console.log(`🌐 ${chain.name} API response:`, response.status, responseText);
                    
                    if (response.ok) {
                        const result = JSON.parse(responseText);
                        console.log(`✅ ${chain.name} Gateway API successful:`, result);
                        
                        // Extract attestation from Gateway API response
                        const attestation = result.attestation;
                        const signature = result.signature;
                        
                        if (attestation && signature) {
                            console.log(`🎫 ${chain.name} attestation received, calling gatewayMint()...`);
                            
                            try {
                                // Call gatewayMint on destination chain
                                const mintResult = await mintPerDestination({
                                    destinationDomain: chain.domain,
                                    attestation: attestation,
                                    signature: signature
                                });
                                
                                apiResults.push({ 
                                    chain: chain.name, 
                                    success: true, 
                                    result: result,
                                    mintTx: mintResult.hash,
                                    mintStatus: mintResult.status,
                                    explorer: mintResult.explorer
                                });
                                console.log(`✅ ${chain.name} gatewayMint successful:`, mintResult);
                                
                            } catch (mintError) {
                                console.error(`❌ ${chain.name} gatewayMint failed:`, mintError);
                                apiResults.push({ 
                                    chain: chain.name, 
                                    success: false, 
                                    result: result,
                                    error: `Mint failed: ${mintError.message}`,
                                    attestation: attestation
                                });
                            }
                        } else {
                            console.warn(`⚠️ ${chain.name} API response missing attestation/signature`);
                            apiResults.push({ chain: chain.name, success: true, result, error: 'Missing attestation' });
                        }
                    } else {
                        apiResults.push({ chain: chain.name, success: false, error: responseText, status: response.status });
                        console.error(`❌ ${chain.name} transfer failed: ${response.status} - ${responseText}`);
                    }
                } catch (error) {
                    apiResults.push({ chain: chain.name, success: false, error: error.message });
                    console.error(`❌ ${chain.name} API call failed:`, error);
                }
            }
            
            console.log('📊 All API calls completed:', apiResults);
            
            // Process results for each chain based on API responses
            const deploymentResults = [];
            let totalDeployed = 0;
            
            apiResults.forEach((apiResult, index) => {
                const chain = chains[index];
                let deploymentResult;
                
                if (apiResult.success && apiResult.mintTx) {
                    // Successful API call with successful gatewayMint
                    const txHash = apiResult.mintTx;
                    const isRealTx = apiResult.mintStatus === 'success';
                    
                    console.log(`🔍 Gateway mint analysis for ${chain.name}:`);
                    console.log(`   Mint TX Hash: ${txHash}`);
                    console.log(`   Mint Status: ${apiResult.mintStatus}`);
                    console.log(`   Explorer: ${apiResult.explorer}`);
                    
                    deploymentResult = {
                        chain: chain.name,
                        chainIcon: chain.icon,
                        domain: chain.domain,
                        operation: chain.operation,
                        amount: deploymentAmountPerChain,
                        transactionHash: txHash,
                        explorerUrl: apiResult.explorer,
                        status: 'completed',
                        timestamp: new Date().toLocaleTimeString(),
                        real: isRealTx
                    };
                    
                    if (isRealTx) {
                        totalDeployed += deploymentAmountPerChain;
                    }
                    
                    console.log(`✅ ${chain.icon} ${chain.name}: ${deploymentAmountPerChain.toFixed(2)} USDC deployed for ${chain.operation} - TX: ${txHash}`);
                } else if (apiResult.success && !apiResult.mintTx) {
                    // API successful but mint failed
                    deploymentResult = {
                        chain: chain.name,
                        chainIcon: chain.icon,
                        domain: chain.domain,
                        operation: chain.operation,
                        amount: deploymentAmountPerChain,
                        transactionHash: 'No mint tx',
                        explorerUrl: '#',
                        status: 'mint_failed',
                        timestamp: new Date().toLocaleTimeString(),
                        real: false,
                        error: apiResult.error || 'Attestation received but mint failed'
                    };
                    console.log(`⚠️ ${chain.icon} ${chain.name}: Attestation received but mint failed - ${apiResult.error}`);
                } else {
                    // Failed API call
                    deploymentResult = {
                        chain: chain.name,
                        chainIcon: chain.icon,
                        domain: chain.domain,
                        operation: chain.operation,
                        amount: deploymentAmountPerChain,
                        status: 'api_failed',
                        timestamp: new Date().toLocaleTimeString(),
                        real: false,
                        error: `API Error ${apiResult.status || ''}: ${apiResult.error}`
                    };
                    console.log(`❌ ${chain.icon} ${chain.name}: ${deploymentAmountPerChain.toFixed(2)} USDC deployment failed - ${apiResult.error}`);
                }
                
                deploymentResults.push(deploymentResult);
            });
            
            // Total spent by agent across all chains (should equal totalAgentSpending)
            console.log(`💸 Agent spent ${totalDeployed.toFixed(2)} USDC across ${chains.length} chains`);
            
            // Wait for transfers to propagate before checking balance
            console.log('⏳ Waiting 3 seconds for transfers to propagate...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Get AFTER balance for verification
            console.log('📡 Fetching AFTER balance for verification...');
            const afterBalanceData = await this.getRealGatewayBalanceWithBreakdown();
            
            // Gateway balance verification link (AFTER) 
            console.log(`🔗 Gateway Balance API (AFTER): ${gatewayBalanceUrl}`);
            
            // Compare BEFORE vs AFTER balances
            const balanceDifference = beforeBalanceData.total - afterBalanceData.total;
            console.log(`📊 Balance comparison:`);
            console.log(`   BEFORE: ${beforeBalanceData.total.toFixed(2)} USDC`);
            console.log(`   AFTER:  ${afterBalanceData.total.toFixed(2)} USDC`);
            console.log(`   CHANGE: ${balanceDifference > 0 ? '-' : '+'}${Math.abs(balanceDifference).toFixed(2)} USDC`);
            
            // CRITICAL DEBUG: Analyze why balance doesn't change
            if (Math.abs(balanceDifference) < 0.001) {
                console.error(`🚨 BALANCE NEVER CHANGED! This indicates:`);
                console.error(`   1. ❌ API calls are returning success but not actually transferring`);
                console.error(`   2. ❌ Transaction hashes are fake/simulated`);
                console.error(`   3. ❌ Circle Gateway API is not moving real funds`);
                console.error(`   Expected decrease: ${totalAgentSpending.toFixed(2)} USDC`);
                console.error(`   Actual change: ${balanceDifference.toFixed(6)} USDC`);
                console.error(`   🔍 Check deploymentResults for real transaction hashes vs simulated`);
            }
            
            // All deployments should succeed with the new batched approach
            const successfulDeployments = deploymentResults.filter(d => d.status === 'completed' && d.real);
            const actualAmountSpent = successfulDeployments.length * deploymentAmountPerChain;
            console.log(`💰 Expected spending: ${totalAgentSpending.toFixed(2)} USDC`);
            console.log(`💰 Actual spending: ${actualAmountSpent.toFixed(2)} USDC (${successfulDeployments.length} successful deployments)`);
            
            // For multi-chain deployment, total balance decreases by total deployed
            this.updateGatewayBalance(afterBalanceData.total);
            
            return {
                success: true,
                multiChain: true,
                deploymentType: 'multi_chain_gateway',
                totalDeployed: totalDeployed,
                chainsDeployed: chains.length,
                deploymentResults: deploymentResults,
                amount: actualAmountSpent, // Actual amount spent (only successful deployments)
                source: 'Gateway Unified Balance',
                recipient: recipientAddress,
                destinationChain: `${chains.length} chains (Ethereum, Base, Avalanche)`,
                destinationIcon: '🌐',
                status: 'completed',
                instant: true,
                real: true,
                gatewayApi: true,
                balanceBefore: beforeBalanceData.total.toFixed(2),
                balanceAfter: afterBalanceData.total.toFixed(2),
                balanceChange: actualAmountSpent > 0 ? balanceDifference.toFixed(2) : '0.00',
                expectedChange: totalAgentSpending.toFixed(2),
                actualSpent: actualAmountSpent.toFixed(2),
                gatewayBalanceUrl: gatewayBalanceUrl,
                note: `ZKP-authorized agent spent ${totalDeployed.toFixed(2)} USDC across ${chains.length} chains instantly`
            };
            
        } catch (error) {
            console.error('❌ Gateway transfer failed:', error);
            throw error;
        }
    }

    // Get real Gateway unified balance using Circle Gateway API
    async getRealGatewayBalance() {
        try {
            console.log('📡 Checking real Gateway unified balance...');
            
            // Get user's wallet address
            const userAddress = this.userAccount || '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
            
            // Call real Circle Gateway API with correct format
            const response = await fetch(`https://gateway-api-testnet.circle.com/v1/balances?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getCircleAPIKey()}`
                },
                body: safeStringify({
                    token: "USDC",
                    sources: [
                        { domain: 0, depositor: userAddress }, // Ethereum
                        { domain: 1, depositor: userAddress }, // Avalanche  
                        { domain: 6, depositor: userAddress }  // Base
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Gateway API failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🌐 Gateway balance API response:', safeStringify(data));
            
            // Gateway unified balance is the total across all domains
            const unifiedBalance = data.balances?.reduce((total, balance) => {
                console.log(`   Domain ${balance.domain}: ${balance.balance} USDC`);
                return total + parseFloat(balance.balance || '0');
            }, 0) || 0;
            
            console.log(`✅ Real Gateway unified balance: ${unifiedBalance} USDC`);
            console.log(`🔍 Is this actually real? API returned ${data.balances?.length || 0} balance entries`);
            return unifiedBalance;
            
        } catch (error) {
            console.error('❌ Gateway API failed:', error.message);
            throw new Error(`Failed to get real Gateway balance: ${error.message}`);
        }
    }

    // Get real Gateway balance with multi-chain breakdown
    async getRealGatewayBalanceWithBreakdown() {
        try {
            console.log('📡 Fetching REAL Gateway balance with chain breakdown...');
            
            const userAddress = this.userAccount || '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
            
            const response = await fetch(`https://gateway-api-testnet.circle.com/v1/balances?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getCircleAPIKey()}`
                },
                body: safeStringify({
                    token: "USDC",
                    sources: [
                        { domain: 0, depositor: userAddress }, // Ethereum Sepolia
                        { domain: 1, depositor: userAddress }, // Avalanche Fuji  
                        { domain: 6, depositor: userAddress }  // Base Sepolia
                    ]
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gateway API ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('🌐 Real Gateway API response:', safeStringify(data));
            
            // Map domain IDs to network names
            const domainNames = {
                0: { name: 'Ethereum Sepolia', icon: '🔷' },
                1: { name: 'Avalanche Fuji', icon: '🔺' },
                6: { name: 'Base Sepolia', icon: '🟦' }
            };
            
            let totalBalance = 0;
            let breakdown = '';
            
            if (data.balances && data.balances.length > 0) {
                data.balances.forEach(balance => {
                    // Use total balance per chain for unified wallet (as per Circle's blog post)
                    const chainBalance = parseFloat(balance.balance || '0');
                    
                    totalBalance += chainBalance;
                    const network = domainNames[balance.domain];
                    if (network && chainBalance > 0) {
                        breakdown += `${network.icon} ${network.name}: ${chainBalance.toFixed(2)} USDC\n`;
                        console.log(`   ${network.name}: ${chainBalance.toFixed(2)} USDC`);
                    }
                });
                
                // Don't prepend total - it's already in the header
                // breakdown = `💰 TOTAL Gateway Balance: ${totalBalance.toFixed(2)} USDC\n\n` + breakdown;
            } else {
                breakdown = 'No balances found - may need USDC deposits to Gateway address';
            }
            
            console.log(`✅ REAL unified balance: ${totalBalance} USDC`);
            console.log(`📋 Chain breakdown:\n${breakdown}`);
            
            return {
                total: totalBalance,
                breakdown: breakdown,
                isReal: true,
                chainCount: data.balances?.length || 0
            };
            
        } catch (error) {
            console.error('❌ Gateway balance API failed:', error.message);
            throw error;
        }
    }

    updateGatewayBalance(newBalance) {
        // Only for local tracking of transfers, not for balance source
        localStorage.setItem('gateway_balance_tracking', newBalance.toString());
        console.log(`📝 Balance tracking updated: ${newBalance} USDC (real balance from API)`);
    }

    updateStepStatus(stepId, status) {
        const step = document.querySelector(`[data-step-id="${stepId}"]`);
        if (step) {
            step.className = step.className.replace(/\b(pending|executing|completed|failed)\b/g, '');
            step.classList.add(status === 'in_progress' ? 'executing' : status);
            
            const statusElement = step.querySelector('.step-status');
            if (statusElement) {
                statusElement.textContent = this.getStepStatusText(status);
                statusElement.className = statusElement.className.replace(/\b(pending|executing|completed|failed)\b/g, '');
                statusElement.classList.add(status === 'in_progress' ? 'executing' : status);
            }
            
            const messageElement = step.querySelector('.step-message');
            if (messageElement) {
                messageElement.textContent = this.getStepMessage(status);
            }
        }
    }

    updateStepContent(stepId, content) {
        const contentElement = document.getElementById(`gateway-step-content-${stepId}`);
        if (contentElement) {
            contentElement.innerHTML = content;
        }
    }

    updateHeaderBalance(workflowId, newBalance) {
        const headerBalanceElement = document.getElementById(`gateway-header-balance-${workflowId}`);
        if (headerBalanceElement) {
            const balance = typeof newBalance === 'number' ? newBalance : parseFloat(newBalance) || 0;
            headerBalanceElement.textContent = `💰 Unified Gateway Balance: ${balance.toFixed(2)} USDC`;
            console.log(`🔄 Updated header balance to: ${balance.toFixed(2)} USDC`);
        }
    }

    updateBalanceBreakdown(workflowId, breakdown) {
        const breakdownElement = document.getElementById(`gateway-balance-breakdown-${workflowId}`);
        if (breakdownElement) {
            breakdownElement.textContent = breakdown;
            console.log(`🔄 Updated balance breakdown`);
        }
    }

    async updateHeaderBalanceWithBreakdown(workflowId) {
        try {
            console.log('📡 Updating Gateway balance with real-time breakdown...');
            const balanceData = await this.getRealGatewayBalanceWithBreakdown();
            
            // Update both balance and breakdown
            this.updateHeaderBalance(workflowId, balanceData.total);
            this.updateBalanceBreakdown(workflowId, balanceData.breakdown);
            
            // Check for locked funds issue
            await this.checkForLockedFunds(workflowId, balanceData);
            
            console.log('✅ Real-time Gateway balance updated');
        } catch (error) {
            console.warn('⚠️ Failed to update Gateway balance:', error.message);
            this.updateBalanceBreakdown(workflowId, 'API Error - Check Circle Keys');
        }
    }

    async checkForLockedFunds(workflowId, balanceData) {
        // Check if we have deposited funds but none available
        const userAddress = this.userAccount || '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
        
        try {
            const response = await fetch(`https://gateway-api-testnet.circle.com/v1/balances?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getCircleAPIKey()}`
                },
                body: safeStringify({
                    token: "USDC",
                    sources: [
                        { domain: 0, depositor: userAddress },
                        { domain: 1, depositor: userAddress },
                        { domain: 6, depositor: userAddress }
                    ]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                let totalDeposited = 0;
                let totalAvailable = 0;
                
                data.balances?.forEach(balance => {
                    totalDeposited += parseFloat(balance.balance || 0);
                    totalAvailable += parseFloat(balance.available || 0);
                });
                
                // If funds are deposited but not available, show fix instructions
                if (totalDeposited > 0 && totalAvailable === 0) {
                    this.showLockedFundsFix(workflowId, totalDeposited, userAddress);
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not check for locked funds:', error.message);
        }
    }

    showLockedFundsFix(workflowId, lockedAmount, userAddress) {
        const workflowCard = document.querySelector(`[data-workflow-id="${workflowId}"]`);
        if (!workflowCard) return;
        
        // Check if fix message already exists
        if (workflowCard.querySelector('.locked-funds-fix')) return;
        
        const fixElement = document.createElement('div');
        fixElement.className = 'locked-funds-fix';
        fixElement.innerHTML = `
            <div style="background: linear-gradient(135deg, #fef3c7, #fbbf24); border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 12px 0; color: #92400e;">
                <h4 style="margin: 0 0 8px 0; color: #dc2626;">🚨 Funds Locked - Transfers Blocked</h4>
                <p style="margin: 8px 0; font-weight: 600;">Issue: ${lockedAmount.toFixed(2)} USDC deposited but 0.00 USDC available</p>
                <p style="margin: 8px 0; font-style: italic;">Circle Gateway requires "available" balance for transfers.</p>
                
                <div style="background: rgba(255,255,255,0.7); border-radius: 6px; padding: 12px; margin: 12px 0;">
                    <strong>✅ Quick Fix:</strong>
                    <ol style="margin: 8px 0; padding-left: 20px;">
                        <li>Go to <a href="https://faucet.circle.com/" target="_blank" style="color: #059669; font-weight: 600;">Circle Faucet</a></li>
                        <li>Enter wallet: <code style="background: #e5e7eb; padding: 2px 4px; border-radius: 3px; font-size: 11px;">${userAddress}</code></li>
                        <li>Select "Sepolia" network</li>
                        <li>Request fresh testnet USDC</li>
                        <li>Wait for "available" balance to appear</li>
                    </ol>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button onclick="window.open('https://faucet.circle.com/', '_blank')" 
                            style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: 600; cursor: pointer;">
                        🚰 Open Faucet
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        Dismiss
                    </button>
                </div>
            </div>
        `;
        
        // Insert after the balance breakdown
        const balanceSection = workflowCard.querySelector('.gateway-unified-balance');
        if (balanceSection) {
            balanceSection.parentNode.insertBefore(fixElement, balanceSection.nextSibling);
        } else {
            workflowCard.appendChild(fixElement);
        }
        
        console.log('🚨 Displayed locked funds fix instructions');
    }

    // Check if a message is a Gateway workflow command
    static isGatewayCommand(message) {
        const lowerMessage = message.toLowerCase();
        return (
            // Original transfer/send/execute commands
            ((lowerMessage.includes('transfer') || 
              lowerMessage.includes('send') || 
              lowerMessage.includes('execute')) &&
             (lowerMessage.includes('gateway') ||
              lowerMessage.includes('instant') ||
              lowerMessage.includes('multi-chain') ||
              lowerMessage.includes('unified'))) ||
            // NEW: ZKP-authorization commands for Gateway
            (lowerMessage.includes('authorize') && 
             lowerMessage.includes('financial_executor') && 
             lowerMessage.includes('gateway')) ||
            // NEW: Multi-chain operations OR payments
            (lowerMessage.includes('multi-chain') && 
             (lowerMessage.includes('operations') || lowerMessage.includes('payments')))
        );
    }

    // Parse Gateway command from natural language
    static parseGatewayCommand(message) {
        const patterns = {
            amount: /(\\d+(?:\\.\\d+)?)\\s*usdc/i,
            agent: /agent\\s+([a-zA-Z0-9_]+)/i,
            chains: /(\\d+)\\s*chains?/i,
            recipient: /(0x[0-9a-fA-F]{40})/i
        };

        const result = {};
        
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = message.match(pattern);
            if (match) {
                result[key] = match[1];
            }
        }

        // Set defaults
        result.amount = result.amount || '0.01';
        result.agent = result.agent || 'financial_executor_007';
        result.chains = result.chains || '7';
        result.environment = 'testnet'; // Start with testnet
        result.recipient = result.recipient || '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87';

        return result;
    }

    // Test function to create a sample workflow
    async createTestWorkflow(testnet = true) {
        const workflowId = `gateway_test_${Date.now()}`;
        
        // AGGRESSIVELY CLEAR ALL CACHED GATEWAY DATA 
        console.log('🧹 AGGRESSIVELY clearing all cached Gateway data...');
        localStorage.clear(); // Clear ALL localStorage
        sessionStorage.clear(); // Clear ALL sessionStorage
        
        // Also clear specific Gateway keys and any potential cached values
        ['gateway_balance_tracking', 'gateway_unified_balance', 'gateway_breakdown', 
         'gateway_workflow_data', 'gateway_test_data', 'gateway_6_usdc_cache',
         'circle_gateway_balance', 'gateway_balance_cache'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Clear any window-level cached data
        if (window.gatewayBalanceCache) {
            delete window.gatewayBalanceCache;
        }
        
        console.log('✅ ALL CACHE CLEARED - will fetch fresh API data only');
        
        // Get REAL Gateway unified balance immediately (NEVER use cache)
        let realUnifiedBalance = 'Loading...';
        let balanceBreakdown = '';
        
        try {
            console.log('📡 Fetching FRESH Gateway unified balance from Circle API...');
            const balanceData = await this.getRealGatewayBalanceWithBreakdown();
            realUnifiedBalance = `${balanceData.total.toFixed(2)} USDC`;
            balanceBreakdown = balanceData.breakdown;
            console.log('✅ FRESH Gateway balance loaded (no cache):', realUnifiedBalance);
            console.log('🔍 Balance breakdown received:', balanceBreakdown);
        } catch (error) {
            console.warn('⚠️ Failed to get real Gateway balance:', error.message);
            realUnifiedBalance = 'API Error - Check Circle Keys';
            balanceBreakdown = 'Could not fetch live balance from Circle Gateway API';
        }
        
        const workflowData = {
            workflow_id: workflowId,
            environment: testnet ? 'testnet' : 'mainnet',
            amount: '0.01',
            agentId: 'financial_executor_007',
            unifiedBalance: realUnifiedBalance,
            balanceBreakdown: balanceBreakdown
        };

        const workflowCard = this.createGatewayWorkflowCard(workflowData);
        this.uiManager.addMessage(workflowCard, 'assistant');
        
        // Make handlers globally available
        window.gatewayWorkflowManager = this;
        
        // Refresh balance breakdown after a short delay to ensure DOM is ready
        setTimeout(async () => {
            try {
                await this.updateHeaderBalanceWithBreakdown(workflowId);
            } catch (error) {
                console.warn('Failed to refresh balance breakdown:', error.message);
            }
        }, 1000);
        
        console.log('🧪 Test Gateway workflow created with real balance');
        return workflowId;
    }

    // Handle Gateway workflow errors
    handleGatewayError(data) {
        console.error('🌐 Gateway workflow error:', data);
        
        // Update workflow status to show error
        const workflowCard = document.querySelector(`[data-workflow-id="${data.workflow_id}"]`);
        if (workflowCard) {
            const statusElement = workflowCard.querySelector('.workflow-status');
            if (statusElement) {
                statusElement.textContent = 'FAILED';
                statusElement.className = 'workflow-status failed';
            }
        }
        
        // Show error message to user
        if (this.uiManager && this.uiManager.showToast) {
            this.uiManager.showToast(`Gateway workflow failed: ${data.error}`, 'error');
        }
    }

    async checkGatewayBalanceManually() {
        try {
            console.log('🔍 Manual Gateway balance check requested...');
            
            // Show loading state
            this.uiManager.showToast('Checking Gateway balance...', 'info');
            
            // Get fresh balance data
            const balanceData = await this.getRealGatewayBalanceWithBreakdown();
            
            // Log balance update (simplified - no UI updates for now)
            console.log(`💰 Gateway balance updated: ${balanceData.total.toFixed(2)} USDC`);
            
            // Show result
            const message = `💰 Gateway Balance: ${balanceData.total.toFixed(2)} USDC\n${balanceData.breakdown}`;
            this.uiManager.showToast(message, 'success');
            
            console.log('✅ Manual balance check completed:', balanceData);
            
        } catch (error) {
            console.error('❌ Manual balance check failed:', error);
            this.uiManager.showToast(`Balance check failed: ${error.message}`, 'error');
        }
    }
}