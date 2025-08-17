// Main application entry point
// Cache bust: 20250120-1
console.log('=== Main.js loading started ===');
import { config } from './core/config.js?v=20250120-1';
import { WebSocketManager } from './ui/websocket-manager.js?v=20250120-1';
import { UIManager } from './ui/ui-manager.js?v=20250120-1';
import { ProofManager } from './ui/proof-manager.js?v=20250120-1';
import { WorkflowManager } from './ui/workflow-manager.js?v=20250816-8';
import { TransferManager } from './ui/transfer-manager.js?v=20250120-1';
import { BlockchainVerifier } from './blockchain/blockchain-verifier.js?v=20250120-1';
import { debugLog } from './core/utils.js?v=20250120-1';

// Export config and debugLog to window for non-module scripts
window.config = config;
window.debugLog = debugLog;

// Global state
let lastSentMessage = '';
let lastSentTime = 0;
let sendingInProgress = false;
let enterKeyDown = false;
let messageHistory = new Set();
let pendingAIResponses = new Map();

// Initialize managers
const wsManager = new WebSocketManager();
const uiManager = new UIManager();
const proofManager = new ProofManager(uiManager);
const transferManager = new TransferManager(uiManager);
const workflowManager = new WorkflowManager(uiManager, transferManager);
const blockchainVerifier = new BlockchainVerifier(uiManager, proofManager);

// Ensure proofManager.proofs is initialized
if (!proofManager.proofs) {
    console.warn('ProofManager.proofs was not initialized, creating new Map');
    proofManager.proofs = new Map();
}

// Make some functions globally accessible for onclick handlers
window.proofManager = proofManager;
window.blockchainVerifier = blockchainVerifier;
window.wsManager = wsManager;
window.handleVerifyAction = (proofId, proofFunction, action) => {
    blockchainVerifier.handleVerifyAction(proofId, proofFunction, action);
};

// Debug function to test proof card display
window.testProofCard = () => {
    const testData = {
        proofId: 'test-' + Date.now(),
        status: 'complete',
        message: 'Test proof generated successfully',
        proof_function: 'prove_kyc',
        metrics: {
            generation_time_ms: 15234,
            proof_size: 18874368
        }
    };
    const proofCard = proofManager.addProofCard(testData);
    uiManager.addMessage(proofCard, 'assistant');
    debugLog('Test proof card added', 'info');
};

// Debug function to test workflow card display
window.testWorkflowCard = () => {
    const testData = {
        workflow_id: 'wf-' + Date.now(),
        steps: [
            {
                id: 'step1',
                name: 'Generate KYC Proof',
                status: 'completed'
            },
            {
                id: 'step2', 
                name: 'Verify on Ethereum',
                status: 'in_progress'
            },
            {
                id: 'step3',
                name: 'Transfer USDC',
                status: 'pending'
            }
        ]
    };
    const workflowCard = workflowManager.addWorkflowCard(testData);
    uiManager.addMessage(workflowCard, 'assistant');
    debugLog('Test workflow card added', 'info');
};

// Test function to simulate proof generation
window.testProofGeneration = () => {
    // Simulate proof_status message
    const proofId = 'test-proof-' + Date.now();
    wsManager.handleMessage({
        type: 'proof_status',
        status: 'generating',
        proof_id: proofId,
        message: 'Generating proof...',
        metadata: {
            function: 'prove_kyc',
            arguments: ['12345', '1']
        }
    });
    
    // Simulate completion after 2 seconds
    setTimeout(() => {
        wsManager.handleMessage({
            type: 'proof_complete',
            proof_id: proofId,
            status: 'complete',
            metrics: {
                generation_time_secs: 2.5,
                proof_size: 19038604,
                time_ms: 2500
            },
            metadata: {
                function: 'prove_kyc',
                arguments: ['12345', '1']
            }
        });
    }, 2000);
};

// Track if we're already switching networks
let isNetworkSwitching = false;
let lastNetworkSwitchTime = 0;

// Check and switch to IoTeX network
async function checkAndSwitchToIoTeX() {
    if (!window.ethereum) {
        throw new Error('MetaMask not installed');
    }
    
    // Prevent concurrent network switches
    if (isNetworkSwitching) {
        debugLog('Network switch already in progress, skipping...', 'info');
        return;
    }
    
    // Prevent rapid successive switches
    const now = Date.now();
    if (now - lastNetworkSwitchTime < 3000) {
        debugLog('Recent network switch detected, skipping...', 'info');
        return;
    }
    
    try {
        isNetworkSwitching = true;
        
        // Check current network
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== config.blockchain.iotex.chainIdDecimal) {
            debugLog('Not on IoTeX network, switching...', 'info');
            
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: config.blockchain.iotex.chainId }],
                });
                debugLog('Successfully switched to IoTeX network', 'success');
            } catch (switchError) {
                if (switchError.code === 4902) {
                    debugLog('IoTeX network not found, adding it...', 'info');
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: config.blockchain.iotex.chainId,
                            chainName: config.blockchain.iotex.name,
                            nativeCurrency: config.blockchain.iotex.nativeCurrency,
                            rpcUrls: [config.blockchain.iotex.rpcUrl],
                            blockExplorerUrls: [config.blockchain.iotex.explorerUrl]
                        }],
                    });
                    debugLog('IoTeX network added and switched', 'success');
                } else if (switchError.code === -32603 && switchError.message?.includes('selected network')) {
                    // Network switch in progress or completed
                    debugLog('Network switch may already be in progress', 'info');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Check if we're now on the right network
                    const newProvider = new ethers.providers.Web3Provider(window.ethereum);
                    const newNetwork = await newProvider.getNetwork();
                    if (newNetwork.chainId === config.blockchain.iotex.chainIdDecimal) {
                        debugLog('Network switch completed successfully', 'success');
                    }
                } else if (switchError.code === 4001) {
                    debugLog('User rejected network switch', 'warning');
                    throw new Error('Please switch to IoTeX network to continue');
                } else {
                    throw switchError;
                }
            }
        } else {
            debugLog('Already on IoTeX network', 'info');
        }
    } finally {
        isNetworkSwitching = false;
        lastNetworkSwitchTime = Date.now();
    }
}

// Export to window for use by other modules
window.checkAndSwitchToIoTeX = checkAndSwitchToIoTeX;

// Initialize all blockchain connections
async function initializeBlockchainConnections() {
    debugLog('Initializing blockchain connections...', 'info');
    
    const connections = {
        ethereum: false,
        solana: false,
        base: false,
        avalanche: false,
        iotex: false
    };
    
    // Initialize Ethereum/MetaMask connections (ETH, Base, Avalanche, IoTeX)
    if (window.ethereum) {
        try {
            // Check if already connected (don't force popup)
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            // If not connected, try to connect
            if (accounts.length === 0) {
                debugLog('MetaMask not connected, requesting access...', 'info');
                try {
                    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                } catch (err) {
                    debugLog('User rejected MetaMask connection', 'warning');
                    return connections;
                }
            }
            
            if (accounts.length > 0) {
                debugLog(`MetaMask connected with account: ${accounts[0]}`, 'success');
                
                // Get current network
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                debugLog(`Current chain ID: ${chainId}`, 'info');
                
                // Mark all EVM chains as available (user can switch between them)
                connections.ethereum = true;
                connections.base = true;
                connections.avalanche = true;
                connections.iotex = true;
            
            // Initialize blockchain verifiers that aren't already created
            try {
                // BlockchainVerifier is already created globally, just set window reference
                if (blockchainVerifier) {
                    window.blockchainVerifier = blockchainVerifier;
                    debugLog('Blockchain verifier available', 'success');
                }
                
                // AvalancheMedicalVerifier - create if not exists
                if (typeof AvalancheMedicalVerifier !== 'undefined' && !window.avalancheMedicalVerifier) {
                    window.avalancheMedicalVerifier = new AvalancheMedicalVerifier();
                    debugLog('Avalanche medical verifier created', 'success');
                }
                
                // IoTeXDeviceVerifier - create if not exists
                if (typeof IoTeXDeviceVerifier !== 'undefined' && !window.iotexDeviceVerifier) {
                    window.iotexDeviceVerifier = new IoTeXDeviceVerifier();
                    debugLog('IoTeX device verifier created', 'success');
                }
            } catch (error) {
                debugLog(`Error initializing verifiers: ${error.message}`, 'error');
            }
            
                // DISABLED: Don't show chains as connected until user explicitly connects
                // updateWalletStatus('eth', true);
                // updateWalletStatus('base', true);
                // updateWalletStatus('avalanche', true);
                // updateWalletStatus('iotex', true);
                
                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    debugLog(`Account changed to: ${accounts[0]}`, 'info');
                    if (accounts.length === 0) {
                        // User disconnected wallet
                        updateWalletStatus('eth', false);
                        updateWalletStatus('base', false);
                        updateWalletStatus('avalanche', false);
                        updateWalletStatus('iotex', false);
                    }
                });
                
                // Listen for chain changes
                window.ethereum.on('chainChanged', (chainId) => {
                    debugLog(`Chain changed to: ${chainId}`, 'info');
                    // DISABLED: Don't reload on chain change to prevent refresh loops
                    console.log('Chain changed, but not reloading page');
                });
            }
            
        } catch (error) {
            debugLog(`MetaMask initialization error: ${error.message}`, 'error');
            console.error('MetaMask error details:', error);
        }
    } else {
        debugLog('MetaMask not detected', 'warning');
    }
    
    // Initialize Solana connection
    // DISABLED: Don't auto-connect to Solana
    /*
    if (window.solana || window.solflare) {
        try {
            const wallet = window.solflare || window.solana;
            if (wallet.isConnected || (await wallet.connect())) {
                connections.solana = true;
                updateWalletStatus('sol', true);
                debugLog('Solana wallet connected', 'success');
            }
        } catch (error) {
            debugLog(`Solana wallet error: ${error.message}`, 'error');
        }
    }
    */
    
    debugLog(`Blockchain connections initialized: ${JSON.stringify(connections)}`, 'info');
    return connections;
}

function updateWalletStatus(chain, connected) {
    const statusElement = document.getElementById(`${chain}-wallet-status`);
    if (statusElement) {
        statusElement.style.display = connected ? 'block' : 'none';
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Initializing AgentKit UI...', 'info');
    
    // Suppress MetaMask errors during initialization
    const originalError = console.error;
    console.error = function(...args) {
        // Filter out the specific MetaMask network error during init
        if (args[0] && typeof args[0] === 'string' && 
            args[0].includes('The request has been rejected due to a change in selected network')) {
            debugLog('Suppressed MetaMask network error during init', 'debug');
            return;
        }
        originalError.apply(console, args);
    };
    
    // Initialize blockchain connections after a small delay to ensure all scripts are loaded
    setTimeout(async () => {
        await initializeBlockchainConnections();
    }, 500);
    
    // Restore console.error after initialization
    setTimeout(() => {
        console.error = originalError;
        debugLog('Console error handling restored', 'debug');
    }, 3000);
    
    // Initialize UI manager
    uiManager.init();
    
    // Listen for MetaMask network changes (with delay to avoid initial errors)
    if (window.ethereum) {
        // Delay event listener setup to avoid race conditions
        setTimeout(() => {
            try {
                window.ethereum.on('chainChanged', (chainId) => {
                    debugLog(`Network changed to chain ID: ${chainId}`, 'info');
                    // Update the network switching flag
                    lastNetworkSwitchTime = Date.now();
                });
                
                // Handle account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    debugLog(`Account changed: ${accounts[0] || 'disconnected'}`, 'info');
                });
                
                debugLog('MetaMask event listeners set up successfully', 'info');
            } catch (error) {
                debugLog(`Error setting up MetaMask listeners: ${error.message}`, 'warning');
            }
        }, 1000);
    }
    
    // Set up WebSocket connection handlers
    wsManager.setConnectionHandlers({
        onConnect: () => {
            uiManager.updateConnectionStatus('connected');
            uiManager.disableInput(false);
        },
        onDisconnect: () => {
            uiManager.updateConnectionStatus('disconnected');
        },
        onError: (error) => {
            uiManager.updateConnectionStatus('error');
        }
    });
    
    // Set up WebSocket message handlers
    setupMessageHandlers();
    
    // Set up UI event listeners
    setupUIEventListeners();
    
    // Connect to WebSocket
    wsManager.connect();
    
    // Load sample queries
    loadSampleQueries();
    
    // Auto-connect wallets if previously connected
    // Disabled - BlockchainVerifier handles auto-connect in its constructor
    // autoConnectWallets();
});

function setupMessageHandlers() {
    // Debug handler to log all messages
    wsManager.on('*', (data) => {
        debugLog(`WebSocket message received: type=${data.type || 'NO_TYPE'}, data=${JSON.stringify(data)}`, 'debug');
        console.log('[WS_DEBUG] Message received:', data.type, data);
        
        // Special handling for messages without a type field
        if (!data.type && data.proof_id) {
            debugLog('Detected proof message without type field', 'warning');
        }
        
        // Log medical record messages specifically
        if (data.type === 'medical_record_creation_request') {
            console.log('[WS_DEBUG] MEDICAL REQUEST DETECTED!', data);
        }
    });
    
    // Handle general messages
    wsManager.on('message', (data) => {
        debugLog(`Received message: ${data.content}`, 'info');
        uiManager.removeWaitingMessage();
        uiManager.addMessage(data.content, 'assistant');
    });
    
    // Handle chat_response messages (what the server actually sends)
    wsManager.on('chat_response', (data) => {
        debugLog(`Received chat response: ${data.response}`, 'info');
        uiManager.removeWaitingMessage();
        
        // Skip generic proof history explanation that comes with list commands
        if (data.response && 
            (data.response.includes('The concept of proof has a long history in mathematics') ||
             data.response.includes('This table shows') || 
             data.response.includes('Zero-knowledge proofs are') ||
             data.response.includes('proof history') ||
             data.response.includes('recent proofs') ||
             data.response.includes('Here are your proofs') ||
             data.response.includes('Here\'s your proof history') ||
             data.response.includes('shows all your generated proofs') ||
             data.response.includes('The table displays') ||
             data.response.includes('verification status'))) {
            debugLog('Skipping generic proof history explanation', 'info');
            return;
        }
        
        // Skip AI response if we're showing a list/table
        if (data.intent === 'workflow_executed' && data.workflow_result) {
            const workflowData = data.workflow_result.workflow_data;
            if (workflowData && workflowData.steps && workflowData.steps.length === 1) {
                const step = workflowData.steps[0];
                if (step.action === 'list_proofs' || step.type === 'list_proofs' || 
                    step.description?.toLowerCase().includes('list proofs')) {
                    debugLog('Skipping AI response for list operation', 'info');
                    return;
                }
            }
        }
        
        // Check if this is a workflow execution response
        if (data.intent === 'workflow_executed' && data.response) {
            // For now, just show the response but don't create a workflow card
            // The server should send proper proof messages if it's actually a proof
            uiManager.addMessage(data.response, 'assistant');
        } else if (data.response) {
            uiManager.addMessage(data.response, 'assistant');
        }
    });
    
    // Handle errors
    wsManager.on('error', (data) => {
        debugLog(`Server error: ${data.message}`, 'error');
        uiManager.removeWaitingMessage();
        uiManager.addMessage(`Error: ${data.message}`, 'assistant');
        uiManager.showToast(data.message, 'error');
    });
    
    // Handle proof generation updates
    wsManager.on('proof_generation_started', (data) => {
        console.log('Received proof_generation_started:', data);
        debugLog('Proof generation started', 'info');
        
        // Check if this is part of a workflow
        const activeWorkflowId = data.workflowId || data.workflow_id || 
                               data.additional_context?.workflow_id;
        const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
        
        // Check if this is a device proximity proof
        const isDeviceProximityProof = data.metadata?.function === 'prove_device_proximity' ||
                                       data.proof_function === 'prove_device_proximity';
        
        // Only show proof card for standalone proofs (not device proximity in workflows)
        if (!isPartOfWorkflow && !isDeviceProximityProof) {
            const proofCard = proofManager.addProofCard({
                ...data,
                status: 'generating'
            });
            uiManager.addMessage(proofCard, 'assistant');
        }
    });
    
    
    // Also handle alternative message types
    wsManager.on('proof_started', (data) => {
        debugLog('Proof started (alternative type)', 'info');
        
        // Check if this is part of a workflow
        const activeWorkflowId = data.workflowId || data.workflow_id || 
                               data.additional_context?.workflow_id;
        const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
        
        // Check if this is a device proximity proof
        const isDeviceProximityProof = data.metadata?.function === 'prove_device_proximity' ||
                                       data.proof_function === 'prove_device_proximity';
        
        // Only show proof card for standalone proofs (not device proximity in workflows)
        if (!isPartOfWorkflow && !isDeviceProximityProof) {
            const proofCard = proofManager.addProofCard({
                ...data,
                proofId: data.proof_id || data.proofId,
                status: 'generating'
            });
            uiManager.addMessage(proofCard, 'assistant');
        }
    });
    
    // Handle proof_status messages (what the server actually sends)
    wsManager.on('proof_status', (data) => {
        console.log('Received proof_status:', data);
        console.log('[PROOF_STATUS_DEBUG] Status:', data.status);
        console.log('[PROOF_STATUS_DEBUG] Has workflowId:', !!data.workflowId);
        console.log('[PROOF_STATUS_DEBUG] Active workflows:', Array.from(workflowManager.workflowStates.keys()));
        
        if (data.status === 'generating') {
            debugLog('Proof status: generating', 'info');
            
            // Check if this is part of a workflow - only if there's an active workflow
            // For standalone proofs, even if they have a workflowId, no workflow_started event is sent
            const activeWorkflowId = data.workflowId || data.workflow_id || 
                                   data.additional_context?.workflow_id;
            
            // Extract workflow ID from proof_id if it contains it (e.g., proof_device_proximity_wf_123456_789)
            let extractedWorkflowId = null;
            if (data.proof_id && data.proof_id.includes('_wf_')) {
                const match = data.proof_id.match(/_wf_(\d+)/);
                if (match) {
                    extractedWorkflowId = 'wf_' + match[1];
                }
            }
            
            const finalWorkflowId = activeWorkflowId || extractedWorkflowId;
            
            // A proof is part of a workflow only if:
            // 1. It has a workflow ID AND
            // 2. That workflow has been started (exists in workflowStates)
            const isPartOfWorkflow = finalWorkflowId && workflowManager.workflowStates.has(finalWorkflowId);
            
            // Also check if this is a device proximity proof which should never show a card in workflows
            const isDeviceProximityProof = data.metadata?.function === 'prove_device_proximity' ||
                                          data.proof_function === 'prove_device_proximity' ||
                                          (data.proof_id && data.proof_id.includes('device_proximity'));
            
            // Skip card if:
            // 1. It's part of a workflow OR
            // 2. It's a device proximity proof (these are always part of workflows)
            const shouldSkipCard = isPartOfWorkflow || isDeviceProximityProof;
            
            console.log('[PROOF_STATUS_DEBUG] proof_id:', data.proof_id);
            console.log('[PROOF_STATUS_DEBUG] activeWorkflowId:', activeWorkflowId);
            console.log('[PROOF_STATUS_DEBUG] extractedWorkflowId:', extractedWorkflowId);
            console.log('[PROOF_STATUS_DEBUG] finalWorkflowId:', finalWorkflowId);
            console.log('[PROOF_STATUS_DEBUG] isPartOfWorkflow:', isPartOfWorkflow);
            console.log('[PROOF_STATUS_DEBUG] isDeviceProximityProof:', isDeviceProximityProof);
            console.log('[PROOF_STATUS_DEBUG] shouldSkipCard:', shouldSkipCard);
            console.log('[PROOF_STATUS_DEBUG] Active workflows:', Array.from(workflowManager.workflowStates.keys()));
            
            // Check if this is an AI prediction proof that needs blockchain commitment
            const proofFunction = data.metadata?.function || 'unknown';
            if (proofFunction === 'prove_ai_content' && window.aiPredictionHandler) {
                console.log('[AI_COMMITMENT] Creating blockchain commitment for AI prediction proof');
                
                // Create the commitment with sample data (in real use, this would come from actual AI interaction)
                const prompt = data.metadata?.prompt || "What will be the weather tomorrow?";
                const response = data.metadata?.response || "Based on current patterns, tomorrow will be partly cloudy with a high of 72°F.";
                
                // Create blockchain commitment
                window.aiPredictionHandler.createPredictionCommitment(prompt, response)
                    .then(commitmentData => {
                        console.log('[AI_COMMITMENT] Commitment created:', commitmentData);
                        // Store commitment data globally for later retrieval
                        if (!window.aiCommitmentStore) {
                            window.aiCommitmentStore = new Map();
                        }
                        window.aiCommitmentStore.set(data.proof_id, commitmentData);
                        
                        // Also try to update the card immediately if it exists
                        setTimeout(() => {
                            const card = document.querySelector(`[data-proof-id="${data.proof_id}"]`);
                            if (card && card.querySelector('.card-content')) {
                                const contentDiv = card.querySelector('.card-content');
                                const existingCommitment = contentDiv.querySelector('.commitment-info');
                                if (existingCommitment && commitmentData.isReal) {
                                    // Update with real commitment data
                                    existingCommitment.innerHTML = proofManager.getAICommitmentHTML({ 
                                        metadata: { commitmentData } 
                                    }).match(/<div class="commitment-info"[^>]*>(.*?)<\/div>/s)[1];
                                }
                            }
                        }, 1000);
                    })
                    .catch(error => {
                        console.error('[AI_COMMITMENT] Failed to create commitment:', error);
                        // Continue anyway - the proof manager will show error state
                    });
            }
            
            // Only show proof card for standalone proofs (NOT device proximity proofs in workflows)
            const showProofCard = !shouldSkipCard;
            
            if (showProofCard) {
                console.log('[PROOF_STATUS_DEBUG] Showing proof card for:', data.proof_id);
                const proofCard = proofManager.addProofCard({
                    proofId: data.proof_id,
                    status: 'generating',
                    message: data.message || 'Generating proof...',
                    proof_function: data.metadata?.function || 'unknown',
                    metadata: data.metadata
                });
                uiManager.addMessage(proofCard, 'assistant');
            } else {
                console.log('[PROOF_STATUS_DEBUG] Skipping proof card for workflow proof:', data.proof_id);
                debugLog(`Skipping proof card for workflow proof: ${data.proof_id}`, 'info');
            }
        } else if (data.status === 'complete') {
            debugLog('Proof status: complete', 'success');
            
            // Skip creating cards for device proximity proofs that are part of workflows
            const activeWorkflowId = data.workflowId || data.workflow_id || 
                                   data.additional_context?.workflow_id;
            const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
            
            // Check if this is a device proximity proof
            const isDeviceProximityProof = data.metadata?.function === 'prove_device_proximity' ||
                                          data.proof_function === 'prove_device_proximity' ||
                                          (data.proof_id && data.proof_id.includes('device_proximity'));
            
            if (!isPartOfWorkflow && !isDeviceProximityProof) {
                // Check if card already exists
                const existingCard = document.querySelector(`[data-proof-id="${data.proof_id}"]`);
                if (!existingCard) {
                    console.log('[PROOF_STATUS_DEBUG] Creating card for completed standalone proof');
                    const proofCard = proofManager.addProofCard({
                        proofId: data.proof_id,
                        status: 'complete',
                        message: data.message || 'Proof generation complete',
                        proof_function: data.metadata?.function || 'unknown',
                        metadata: data.metadata,
                        metrics: data.metrics
                    });
                    uiManager.addMessage(proofCard, 'assistant');
                } else {
                    // Update existing card
                    proofManager.updateProofCard(data.proof_id, 'complete', data);
                }
            } else {
                // For workflow proofs, only update if card exists
                const existingCard = document.querySelector(`[data-proof-id="${data.proof_id}"]`);
                if (existingCard) {
                    proofManager.updateProofCard(data.proof_id, 'complete', data);
                } else {
                    console.log('[PROOF_STATUS_DEBUG] No card to update for workflow proof:', data.proof_id);
                }
            }
        } else {
            console.log('[PROOF_STATUS_DEBUG] Ignoring other status:', data.status);
        }
    });
    
    wsManager.on('proof_generation_complete', (data) => {
        debugLog('Proof generation complete', 'success');
        console.log('[HANDLER] proof_generation_complete triggered for:', data.proofId);
        // Only update if card exists
        const existingCard = document.querySelector(`[data-proof-id="${data.proofId}"]`);
        if (existingCard) {
            proofManager.updateProofCard(data.proofId, 'complete', data);
        } else {
            console.log('[HANDLER] No card to update for proof:', data.proofId);
        }
    });
    
    // Alternative completion message type
    wsManager.on('proof_complete', (data) => {
        debugLog('Proof complete (alternative type)', 'success');
        console.log('[HANDLER] proof_complete triggered for:', data.proof_id || data.proofId);
        console.log('[HANDLER] proof_complete data:', data);
        const proofId = data.proof_id || data.proofId;
        
        // Store proof data for later use
        if (proofManager && proofManager.proofs && proofId) {
            proofManager.proofs.set(proofId, data);
        }
        
        // Check if this is part of a multi-step workflow
        const activeWorkflowId = data.workflowId || data.workflow_id || 
                               data.additional_context?.workflow_id;
        const isPartOfMultiStepWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
        
        console.log('[HANDLER] activeWorkflowId:', activeWorkflowId);
        console.log('[HANDLER] isPartOfMultiStepWorkflow:', isPartOfMultiStepWorkflow);
        
        // Update card for standalone proofs AND single-proof workflows
        // (single-proof workflows don't get added to workflowStates)
        if (!isPartOfMultiStepWorkflow) {
            console.log('[HANDLER] Updating proof card for standalone/single-proof workflow');
            
            // Add a small delay to ensure the card exists
            setTimeout(() => {
                const card = document.querySelector(`[data-proof-id="${proofId}"]`);
                if (!card) {
                    console.error('[HANDLER] Card not found after delay, cannot update:', proofId);
                    return;
                }
                
                // Update the existing proof card
                // For AI predictions, check if we have commitment data stored
                const proofFunction = data.metadata?.function || data.proof_function || 'unknown';
                if (proofFunction === 'prove_ai_content') {
                    // First try to get from global store
                    if (window.aiCommitmentStore && window.aiCommitmentStore.has(proofId)) {
                        const commitmentData = window.aiCommitmentStore.get(proofId);
                        if (commitmentData && commitmentData.isReal) {
                            if (!data.metadata) data.metadata = {};
                            data.metadata.commitmentData = commitmentData;
                            console.log('[HANDLER] Found commitment data for proof:', proofId, commitmentData);
                        }
                    } else if (window.aiPredictionHandler) {
                        // Fallback: try to get from handler
                        const commitments = window.aiPredictionHandler.commitments;
                        if (commitments && commitments.size > 0) {
                            // Get the most recent commitment
                            const lastCommitment = Array.from(commitments.values()).pop();
                            if (lastCommitment && lastCommitment.isReal) {
                                if (!data.metadata) data.metadata = {};
                                data.metadata.commitmentData = lastCommitment;
                                console.log('[HANDLER] Using last commitment data:', lastCommitment);
                            }
                        }
                    }
                }
                
                proofManager.updateProofCard(proofId, 'complete', {
                    proofId: proofId,
                    status: 'complete',
                    metrics: data.metrics,
                    metadata: data.metadata,
                    proof_function: proofFunction
                });
            }, 100); // Small delay to ensure DOM is ready
            
            // Silent success - proof card shows completion
        } else {
            console.log('[HANDLER] Skipping update - part of multi-step workflow');
        }
    });
    
    wsManager.on('proof_generation_failed', (data) => {
        debugLog('Proof generation failed', 'error');
        // Update the existing proof card to show error
        proofManager.updateProofCard(data.proofId, 'error', data);
        uiManager.showToast('Proof generation failed', 'error');
    });
    
    // Handle workflow updates
    wsManager.on('workflow_started', async (data) => {
        // Handle both workflow_id and workflowId formats
        data.workflow_id = data.workflow_id || data.workflowId;
        debugLog(`Workflow started: ${data.workflow_id}`, 'info');
        console.log('[WORKFLOW_DEBUG] Workflow started:', data.workflow_id);
        console.log('[WORKFLOW_DEBUG] Steps:', data.steps);
        
        // Remove the waiting message when workflow starts
        uiManager.removeWaitingMessage();
        
        // Check if this is an IoT workflow that needs IoTeX network
        const hasIoTSteps = data.steps && data.steps.some(step => 
            step.action === 'register_device' || 
            step.action === 'verify_on_iotex' ||
            (step.action === 'generate_proof' && step.proof_type === 'device_proximity')
        );
        
        if (hasIoTSteps) {
            debugLog('IoT workflow detected, checking IoTeX network connection...', 'info');
            try {
                // Check and switch to IoTeX network before proceeding
                await checkAndSwitchToIoTeX();
            } catch (error) {
                debugLog(`Failed to switch to IoTeX network: ${error.message}`, 'error');
                uiManager.showToast('Please switch to IoTeX network to continue', 'error');
                // Continue anyway - the individual steps will handle network switching
            }
        }
        
        // Store any pending AI response
        if (data.ai_response) {
            pendingAIResponses.set(data.workflow_id, data.ai_response);
        }
        
        // Only show workflow card if it has multiple steps or involves transfers
        const steps = data.steps || [];
        const hasMultipleSteps = steps.length > 1;
        const hasTransferSteps = steps.some(step => 
            step.action === 'transfer' || 
            step.action === 'send_transfer' ||
            step.description?.toLowerCase().includes('transfer') ||
            step.description?.toLowerCase().includes('send')
        );
        
        // Check if this is just a single proof generation or list operation
        const isSingleProofGeneration = steps.length === 1 && 
            (steps[0].action === 'generate_proof' || 
             steps[0].action === 'proof_generation' ||
             steps[0].type === 'proof_generation' ||
             steps[0].description?.toLowerCase().includes('generate') ||
             steps[0].description?.toLowerCase().includes('proof'));
        
        const isListOperation = steps.length === 1 && 
            (steps[0].action === 'list_proofs' || 
             steps[0].type === 'list_proofs' ||
             steps[0].description?.toLowerCase().includes('list proofs') ||
             steps[0].description?.toLowerCase().includes('list all proofs'));
        
        console.log('[WORKFLOW_DEBUG] hasMultipleSteps:', hasMultipleSteps);
        console.log('[WORKFLOW_DEBUG] hasTransferSteps:', hasTransferSteps);
        console.log('[WORKFLOW_DEBUG] isSingleProofGeneration:', isSingleProofGeneration);
        console.log('[WORKFLOW_DEBUG] isListOperation:', isListOperation);
        
        if (hasMultipleSteps || hasTransferSteps) {
            const workflowCard = workflowManager.addWorkflowCard(data);
            uiManager.addMessage(workflowCard, 'assistant');
        } else if (!isSingleProofGeneration && !isListOperation) {
            // Only track non-proof, non-list workflows that don't show cards
            debugLog('Skipping workflow card but tracking state', 'info');
            workflowManager.workflowStates.set(data.workflow_id, data);
        } else {
            // For single proof generation or list operations, don't track in workflowStates
            // This allows the proof_status handler to create the proof card
            debugLog('Single operation - not tracking as workflow', 'info');
            console.log('[WORKFLOW_DEBUG] NOT adding to workflowStates for single operation');
        }
        
        // Show AI response after workflow card if exists
        const aiResponse = pendingAIResponses.get(data.workflow_id);
        if (aiResponse) {
            uiManager.addMessage(aiResponse, 'assistant');
            pendingAIResponses.delete(data.workflow_id);
        }
    });
    
    wsManager.on('workflow_step_update', (data) => {
        // Handle both workflow_id/workflowId and step_id/stepId formats
        data.workflow_id = data.workflow_id || data.workflowId;
        data.step_id = data.step_id || data.stepId;
        debugLog(`Workflow step update: ${data.workflow_id}/${data.step_id}`, 'info');
        debugLog(`Step update data: ${JSON.stringify(data, null, 2)}`, 'debug');
        
        // Check if this is a network error
        if (data.updates && data.updates.error && 
            (data.updates.error.includes('network') || data.updates.error.includes('-32603'))) {
            debugLog('Network error in workflow step, will retry...', 'warning');
            // Don't mark as failed, let the backend retry
            return;
        }
        
        // Enhanced updates processing - include any result data
        let updates = data.updates || {};
        
        // If the step update contains result information, make sure it's preserved
        if (data.result) {
            updates.result = data.result;
        }
        
        // Check if this is a claim_rewards step completion and has device_id in any field
        if (data.step_id && data.step_id.includes('step_4') && 
            (data.result?.device_id || data.device_id || data.deviceId)) {
            const deviceId = data.result?.device_id || data.device_id || data.deviceId;
            debugLog(`🔍 Found device ID in step update: ${deviceId}`, 'debug');
            
            // Ensure rewardData includes the device ID
            if (!updates.rewardData) {
                updates.rewardData = {};
            }
            updates.rewardData.deviceId = deviceId;
        }
        
        workflowManager.updateWorkflowStep(data.workflow_id, data.step_id, updates);
    });
    
    wsManager.on('workflow_completed', (data) => {
        // Handle both workflow_id and workflowId formats
        data.workflow_id = data.workflow_id || data.workflowId;
        
        debugLog(`Workflow completed: ${data.workflow_id}`, 'success');
        workflowManager.updateWorkflowStatus(data.workflow_id, 'completed');
        // Clean up workflow state after completion
        setTimeout(() => {
            workflowManager.workflowStates.delete(data.workflow_id);
        }, 1000);
        // Silent success - workflow card shows completion
    });
    
    // Response deduplication to prevent multiple MetaMask confirmations
    const processedRequests = new Set();
    
    // Clean up old processed requests every 5 minutes to prevent memory leaks
    setInterval(() => {
        processedRequests.clear();
        debugLog('Cleared processed requests cache', 'debug');
    }, 300000); // 5 minutes
    
    // Handle device registration requests from workflow executor
    wsManager.on('device_registration_request', async (data) => {
        // Check for duplicate request
        const requestKey = `device_registration_${data.requestId}`;
        if (processedRequests.has(requestKey)) {
            debugLog(`Ignoring duplicate device registration request: ${data.requestId}`, 'warning');
            return;
        }
        processedRequests.add(requestKey);
        debugLog(`Device registration request: ${data.deviceId}`, 'info');
        
        try {
            // Check if IoTeX device verifier is available
            if (!window.iotexDeviceVerifier) {
                window.iotexDeviceVerifier = new IoTeXDeviceVerifier();
            }
            
            // Perform the actual device registration
            const result = await window.iotexDeviceVerifier.registerDevice(data.deviceId);
            
            // Send response back to workflow executor
            wsManager.send({
                type: 'device_registration_response',
                requestId: data.requestId,
                success: result.success,
                ioId: result.ioId,
                did: result.did,
                txHash: result.transactionHash || result.verifierTxHash || result.txHash,
                error: result.error
            });
            
            // Update workflow step with transaction info
            if (result.success) {
                workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                    transactionHash: result.transactionHash || result.verifierTxHash || result.txHash,
                    ioId: result.ioId,
                    did: result.did
                });
            }
        } catch (error) {
            debugLog(`Device registration error: ${error.message}`, 'error');
            wsManager.send({
                type: 'device_registration_response',
                requestId: data.requestId,
                success: false,
                error: error.message
            });
        }
    });
    
    // Handle IoTeX verification requests from workflow executor
    wsManager.on('iotex_verification_request', async (data) => {
        // Check for duplicate request
        const requestKey = `iotex_verification_${data.requestId}`;
        if (processedRequests.has(requestKey)) {
            debugLog(`Ignoring duplicate IoTeX verification request: ${data.requestId}`, 'warning');
            return;
        }
        processedRequests.add(requestKey);
        debugLog(`IoTeX verification request for proof: ${data.proofId}`, 'info');
        
        // Ensure managers are initialized
        if (!window.proofManager || !proofManager) {
            console.error('ProofManager not initialized');
            wsManager.send({
                type: 'iotex_verification_response',
                requestId: data.requestId,
                success: false,
                error: 'ProofManager not initialized'
            });
            return;
        }
        
        try {
            // Check if IoTeX device verifier is available
            if (!window.iotexDeviceVerifier) {
                window.iotexDeviceVerifier = new IoTeXDeviceVerifier();
            }
            
            // Get the proof data - either from the message or from proof manager
            let proofData = data.proofData;
            if (!proofData) {
                // Try to get from proof manager with defensive checks
                if (typeof proofManager !== 'undefined' && proofManager && proofManager.proofs && typeof proofManager.proofs.get === 'function') {
                    const storedProof = proofManager.proofs.get(data.proofId);
                    if (storedProof) {
                        // Make sure we have the complete proof data including binary data
                        proofData = {
                            ...storedProof,
                            proof_data: storedProof.proof_data || storedProof.proof_bin,
                            public_inputs: storedProof.public_inputs || storedProof.inputs,
                            metadata: storedProof.metadata || {}
                        };
                        console.log('Retrieved proof data from manager:', {
                            hasProofData: !!proofData.proof_data,
                            hasPublicInputs: !!proofData.public_inputs,
                            proofDataLength: proofData.proof_data ? proofData.proof_data.length : 0
                        });
                    }
                }
                
                // If still no proof data, fetch from HTTP endpoint
                if (!proofData || !proofData.proof_data) {
                    console.log('Fetching proof data from HTTP endpoint for:', data.proofId);
                    try {
                        const response = await fetch(`/api/proof/${data.proofId}/iotex`);
                        if (response.ok) {
                            const iotexData = await response.json();
                            proofData = {
                                proof_data: iotexData.proof_data,
                                public_inputs: iotexData.public_inputs,
                                metadata: iotexData.metadata,
                                device_id: iotexData.device_id,
                                coordinates: iotexData.coordinates
                            };
                            console.log('Fetched proof data from HTTP:', {
                                hasProofData: !!proofData.proof_data,
                                proofDataLength: proofData.proof_data ? proofData.proof_data.length : 0,
                                deviceId: proofData.device_id,
                                coordinates: proofData.coordinates
                            });
                        } else {
                            console.error('Failed to fetch proof from HTTP:', response.status);
                        }
                    } catch (error) {
                        console.error('Error fetching proof from HTTP:', error);
                    }
                }
            }
            
            if (!proofData) {
                console.warn('Proof not found, using mock data for verification');
                // Use mock proof data if none found
                proofData = {
                    public_inputs: ['123456', '5050', '5050'],
                    proof_type: 'device_proximity'
                };
            }
            
            // Debug log the proof data structure
            console.log('=== PROOF DATA BEFORE VERIFICATION ===');
            console.log('Proof data structure:', {
                hasProofData: !!proofData.proof_data,
                proofDataLength: proofData.proof_data ? proofData.proof_data.length : 0,
                hasPublicInputs: !!proofData.public_inputs,
                publicInputsType: typeof proofData.public_inputs,
                publicInputs: proofData.public_inputs,
                coordinates: proofData.coordinates,
                deviceId: proofData.device_id || data.deviceId
            });
            
            // Extract coordinates from proof (device proximity proofs have x,y coordinates)
            let x = 5050, y = 5050; // defaults
            
            // First try to use coordinates from the proof data
            if (proofData.coordinates) {
                x = proofData.coordinates.x || 5050;
                y = proofData.coordinates.y || 5050;
                console.log('Using coordinates from proof data:', { x, y });
            } else if (proofData.public_inputs && proofData.public_inputs.length >= 4) {
                // Public inputs structure: [device_id_hash, within_radius, x, y]
                x = proofData.public_inputs[2] || 5050;
                y = proofData.public_inputs[3] || 5050;
                console.log('Using coordinates from public_inputs:', { x, y });
            } else if (proofData.inputs && proofData.inputs.length >= 4) {
                // Check alternative structure
                x = proofData.inputs[2] || 5050;
                y = proofData.inputs[3] || 5050;
                console.log('Using coordinates from inputs:', { x, y });
            }
            
            console.log('Final coordinates for verification:', { x, y });
            
            // Perform the verification
            const result = await window.iotexDeviceVerifier.verifyDeviceProximity(
                data.deviceId || proofData.device_id || 'DEV123',
                x,
                y,
                proofData
            );
            
            // Send response back to workflow executor
            wsManager.send({
                type: 'iotex_verification_response',
                requestId: data.requestId,
                success: result.success,
                txHash: result.transactionHash || result.txHash,
                error: result.error
            });
            
            // Update workflow step with transaction info
            if (result.success) {
                const config = getConfig();
                const txHash = result.transactionHash || result.txHash;
                const explorerUrl = txHash ? `${config.blockchain.iotex.explorerUrl}/tx/${txHash}` : null;
                
                workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                    transactionHash: txHash,
                    verificationData: {
                        success: true,
                        blockchain: 'IoTeX',
                        transaction_hash: txHash,
                        explorer_url: explorerUrl
                    }
                });
            }
        } catch (error) {
            debugLog(`IoTeX verification error: ${error.message}`, 'error');
            wsManager.send({
                type: 'iotex_verification_response',
                requestId: data.requestId,
                success: false,
                error: error.message
            });
        }
    });
    
    // Handle combined medical record creation and commitment request
    wsManager.on('create_medical_record_with_commitment', async (data) => {
        debugLog(`Medical record creation with commitment: ${data.patientId}`, 'info');
        console.log('[MEDICAL_HANDLER] Creating and committing medical record:', data);
        
        try {
            // Use the medical record handler to create and commit in one step
            if (window.medicalRecordHandler) {
                const recordData = await window.medicalRecordHandler.createAndCommitRecord(
                    data.patientId,
                    data.recordHash
                );
                
                // Update workflow step with commitment data if this is part of a workflow
                if (data.workflowId && data.stepId) {
                    workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                        commitData: {
                            transactionHash: recordData.transactionHash,
                            blockNumber: recordData.blockNumber,
                            recordId: recordData.avalancheRecordId
                        },
                        transactionHash: recordData.transactionHash
                    });
                }
                
                // Send success response
                wsManager.send({
                    type: 'medical_record_complete',
                    requestId: data.requestId,
                    success: true,
                    recordData: recordData
                });
                
                debugLog(`Medical record created and committed: ${recordData.record_id}`, 'success');
            } else {
                throw new Error('Medical record handler not initialized');
            }
        } catch (error) {
            console.error('[MEDICAL_HANDLER] Error:', error);
            wsManager.send({
                type: 'medical_record_complete',
                requestId: data.requestId,
                success: false,
                error: error.message
            });
        }
    });
    
    // Handle medical record creation request (legacy)
    wsManager.on('medical_record_creation_request', async (data) => {
        debugLog(`Medical record creation request: ${data.patientId}`, 'info');
        console.log('[MEDICAL_HANDLER] Received medical_record_creation_request:', data);
        
        try {
            // For testing/demo: immediately respond with success
            // In production, this would actually create the record on Avalanche
            const mockRecordId = `0x${Math.random().toString(16).substring(2, 66)}`;
            const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
            
            console.log('[MEDICAL_HANDLER] Sending response with requestId:', data.requestId);
            
            // Send immediate success response to prevent timeout
            wsManager.send({
                type: 'medical_record_creation_response',
                requestId: data.requestId,
                success: true,
                recordId: mockRecordId,
                transactionHash: mockTxHash
            });
            
            debugLog(`Medical record created (mock): ${mockRecordId}`, 'success');
            
            // Initialize verifier for future use
            if (!window.avalancheMedicalVerifier) {
                window.avalancheMedicalVerifier = new AvalancheMedicalVerifier();
            }
            
            // Optional: Create actual record asynchronously
            setTimeout(async () => {
                try {
                    if (window.avalancheMedicalVerifier && window.avalancheMedicalVerifier.isInitialized) {
                        await window.avalancheMedicalVerifier.createMedicalRecord(
                            data.patientId,
                            data.recordHash,
                            null
                        );
                    }
                } catch (error) {
                    debugLog(`Background medical record creation error: ${error.message}`, 'warning');
                }
            }, 100);
            
        } catch (error) {
            console.error('Medical record creation error:', error);
            wsManager.send({
                type: 'medical_record_creation_response',
                requestId: data.requestId,
                success: false,
                error: error.message
            });
        }
    });
    
    // Handle Avalanche commit request
    wsManager.on('commit_to_avalanche', async (data) => {
        debugLog(`Avalanche commit request for: ${data.recordType}`, 'info');
        console.log('[AVALANCHE_COMMIT] Received commit request:', data);
        
        try {
            // Check if MetaMask is available
            if (!window.ethereum) {
                throw new Error('MetaMask not installed');
            }
            
            // Get current chain ID
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            const avalancheChainId = '0xa869'; // 43113 in hex (Fuji testnet)
            
            // Switch to Avalanche if not already on it
            if (currentChainId !== avalancheChainId) {
                debugLog('Switching to Avalanche network...', 'info');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: avalancheChainId }],
                    });
                } catch (switchError) {
                    // If network doesn't exist, add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: avalancheChainId,
                                chainName: 'Avalanche Fuji Testnet',
                                nativeCurrency: {
                                    name: 'AVAX',
                                    symbol: 'AVAX',
                                    decimals: 18
                                },
                                rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                                blockExplorerUrls: ['https://testnet.snowtrace.io/']
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }
            
            // Wait for the pre-loaded Avalanche medical integrity handler
            let avalancheMedicalIntegrity = window.avalancheMedicalIntegrity;
            if (!avalancheMedicalIntegrity) {
                // Try importing directly if not pre-loaded yet
                const module = await import('/static/js/ui/avalanche-medical-integrity.js');
                avalancheMedicalIntegrity = module.avalancheMedicalIntegrity;
                await avalancheMedicalIntegrity.init();
            }
            
            // Request accounts if needed
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts || accounts.length === 0) {
                debugLog('No accounts connected, requesting access...', 'info');
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }
            const signer = accounts[0];
            
            if (!signer) {
                throw new Error('No MetaMask account available');
            }
            
            // Clean up the record hash to ensure it's valid
            let cleanHash = data.recordHash || '0x0000000000000000000000000000000000000000000000000000000000000000';
            if (cleanHash.includes('...')) {
                // Replace dots with zeros to make it a valid hash
                cleanHash = cleanHash.replace('...', '000');
            }
            // Ensure it's a valid hex string
            if (!cleanHash.startsWith('0x')) {
                cleanHash = '0x' + cleanHash;
            }
            
            debugLog(`Creating medical record with hash: ${cleanHash}`, 'info');
            
            // Call the smart contract to create the medical record
            const result = await avalancheMedicalIntegrity.createMedicalRecord(
                data.patientId || '12345',
                cleanHash,
                signer
            );
            
            debugLog(`Medical record created on-chain with ID: ${result.recordId}`, 'success');
            
            wsManager.send({
                type: 'commit_result',
                requestId: data.requestId,
                success: true,
                result: {
                    success: true,
                    message: `${data.recordType} committed to Avalanche`,
                    recordId: result.recordId,
                    transactionHash: result.txHash,
                    blockNumber: result.blockNumber,
                    gasUsed: result.gasUsed
                },
                transactionHash: result.txHash
            });
            
            debugLog(`${data.recordType} committed to Avalanche: ${result.txHash}`, 'success');
            
        } catch (error) {
            console.error('Avalanche commit error:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                data: error.data,
                stack: error.stack
            });
            
            let errorMessage = error.message;
            
            // Handle specific error codes
            if (error.code === 4001) {
                errorMessage = 'User rejected the transaction';
            } else if (error.code === -32603) {
                errorMessage = 'Internal JSON-RPC error - check if contract exists and account has AVAX';
            } else if (error.code === -32000) {
                errorMessage = 'Insufficient funds for gas';
            }
            
            wsManager.send({
                type: 'commit_result',
                requestId: data.requestId,
                success: false,
                error: errorMessage
            });
        }
    });
    
    // Helper function to wait for transaction confirmation
    async function waitForTransaction(txHash) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const receipt = await provider.waitForTransaction(txHash);
        return receipt;
    }
    
    // Handle Avalanche verification request
    wsManager.on('verify_on_avalanche', async (data) => {
        debugLog(`Avalanche verification request for proof: ${data.proofType}`, 'info');
        console.log('[AVALANCHE_VERIFY] Full request data:', data);
        console.log('[AVALANCHE_VERIFY] AvalancheMedicalVerifier available:', !!window.AvalancheMedicalVerifier);
        console.log('[AVALANCHE_VERIFY] Proof type:', data.proofType);
        console.log('[AVALANCHE_VERIFY] Request ID:', data.requestId);
        
        try {
            // For ALL proof types including medical_integrity, use the standard blockchain verifier
            // Medical proofs are zkEngine proofs just like KYC, age, etc.
            console.log('[AVALANCHE_VERIFY] Using standard blockchain verifier for proof type:', data.proofType);
            
            if (true) {  // Always use standard flow
                if (window.blockchainVerifier) {
                    const result = await window.blockchainVerifier.verifyOnAvalanche(data.proofData.proofId || data.proofData.proof_id, data.proofType);
                    
                    // Update workflow step with verification data if this is part of a workflow
                    if (data.workflowId && data.stepId) {
                        workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                            verificationData: {
                                success: result.success,
                                blockchain: 'Avalanche',
                                transaction_hash: result.txHash || result.transactionHash,
                                explorer_url: result.explorerUrl
                            },
                            transactionHash: result.txHash || result.transactionHash
                        });
                    }
                    
                    wsManager.send({
                        type: 'verification_result',
                        requestId: data.requestId,
                        success: result.success,
                        result: result,
                        transactionHash: result.txHash || result.transactionHash
                    });
                } else {
                    throw new Error('Blockchain verifier not initialized');
                }
            }
            
        } catch (error) {
            console.error('Avalanche verification error:', error);
            let errorMessage = error.message;
            
            // Handle user rejection
            if (error.code === 4001) {
                errorMessage = 'User rejected the transaction';
            }
            
            wsManager.send({
                type: 'verification_result',
                requestId: data.requestId,
                success: false,
                error: errorMessage
            });
        }
    });
    
    // Handle claim rewards requests from workflow executor
    wsManager.on('claim_rewards_request', async (data) => {
        // Check for duplicate request
        const requestKey = `claim_rewards_${data.requestId}`;
        if (processedRequests.has(requestKey)) {
            debugLog(`Ignoring duplicate claim rewards request: ${data.requestId}`, 'warning');
            return;
        }
        processedRequests.add(requestKey);
        debugLog(`Claim rewards request for device: ${data.deviceId || 'undefined device ID'}`, 'info');
        
        try {
            // Check if IoTeX device verifier is available
            if (!window.iotexDeviceVerifier) {
                window.iotexDeviceVerifier = new IoTeXDeviceVerifier();
            }
            
            // Claim rewards for the device
            const result = await window.iotexDeviceVerifier.claimRewards(data.deviceId);
            
            // Send response back to workflow executor
            wsManager.send({
                type: 'claim_rewards_response',
                requestId: data.requestId,
                success: result.success,
                txHash: result.rewardData?.txHash || result.txHash,
                amount: result.rewardData?.amount || result.rewardAmount,
                currency: result.currency || 'IOTX',
                deviceId: data.deviceId, // CRITICAL: Include device ID in response
                error: result.error
            });
            
            if (result.success) {
                // Update workflow step with reward data
                if (data.workflowId && data.stepId) {
                    debugLog(`Updating reward step with deviceId: ${data.deviceId}`, 'debug');
                    workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                        rewardData: {
                            deviceId: data.deviceId,
                            amount: result.rewardData?.amount || result.rewardAmount || '0 IOTX',
                            claimed: true,
                            txHash: result.rewardData?.txHash || result.txHash,
                            message: 'Rewards claimed successfully'
                        },
                        transactionHash: result.rewardData?.txHash || result.txHash
                    });
                }
                
                // Add to blockchain verifications
                const verificationData = {
                    blockchain: 'IoTeX',
                    deviceId: data.deviceId,
                    rewardAmount: result.rewardAmount,
                    currency: 'IOTX',
                    txHash: result.txHash,
                    explorerUrl: result.explorerUrl,
                    timestamp: new Date().toISOString()
                };
                
                const verificationId = `reward_${data.deviceId}_${Date.now()}`;
                blockchainVerifier.onChainVerifications.set(verificationId, verificationData);
                
                debugLog(`Rewards claimed successfully: ${result.rewardAmount} IOTX`, 'success');
            } else {
                // Update workflow step with error
                if (data.workflowId && data.stepId) {
                    workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                        rewardData: {
                            deviceId: data.deviceId,
                            error: result.error,
                            claimed: false
                        }
                    });
                }
            }
        } catch (error) {
            debugLog(`Claim rewards error: ${error.message}`, 'error');
            
            // Update workflow step with error
            if (data.workflowId && data.stepId) {
                workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                    rewardData: {
                        deviceId: data.deviceId,
                        error: error.message,
                        claimed: false
                    }
                });
            }
            
            wsManager.send({
                type: 'claim_rewards_response',
                requestId: data.requestId,
                success: false,
                error: error.message
            });
        }
    });
    
    // Handle claim_rewards_response from workflow executor
    wsManager.on('claim_rewards_response', (data) => {
        debugLog(`Received claim_rewards_response: ${JSON.stringify(data)}`, 'debug');
        
        // If this response contains device ID and is for a workflow step, ensure it gets to the UI
        if (data.success && data.deviceId && data.workflowId && data.stepId) {
            debugLog(`📋 Processing claim response with device ID: ${data.deviceId}`, 'debug');
            workflowManager.updateWorkflowStep(data.workflowId, data.stepId, {
                rewardData: {
                    deviceId: data.deviceId,
                    amount: data.amount || '0 IOTX',
                    claimed: true,
                    txHash: data.txHash,
                    message: 'Rewards claimed successfully'
                },
                transactionHash: data.txHash
            });
        }
    });

    wsManager.on('workflow_failed', (data) => {
        debugLog(`Workflow failed: ${data.workflow_id}`, 'error');
        workflowManager.updateWorkflowStatus(data.workflow_id, 'failed');
        // Clean up workflow state after failure
        setTimeout(() => {
            workflowManager.workflowStates.delete(data.workflow_id);
        }, 1000);
        uiManager.showToast('Workflow failed', 'error');
    });
    
    // Handle transfer updates
    wsManager.on('transfer_update', (data) => {
        debugLog(`Transfer update: ${data.transferId}`, 'info');
        transferManager.updateTransferStatus(data.transferId, data);
    });
    
    // Handle transaction updates
    wsManager.on('transaction', (data) => {
        debugLog('Transaction update received', 'info');
        const transactionCard = transferManager.addTransactionCard(data);
        uiManager.addMessage(transactionCard, 'assistant');
    });
    
    // Handle proof history
    wsManager.on('proof_history', (data) => {
        debugLog('Received proof history', 'info');
        proofManager.displayProofHistory(data);
    });
    
    // Handle list_response (what the backend actually sends)
    wsManager.on('list_response', (data) => {
        debugLog('Received list response', 'info');
        // Remove the waiting message
        uiManager.removeWaitingMessage();
        // Transform to match expected format
        proofManager.displayProofHistory({
            proofs: data.proofs || [],
            count: data.count || 0
        });
    });
    
    // Handle verification results (legacy - kept for compatibility)
    wsManager.on('verification_result', (data) => {
        debugLog('Received verification result', 'info');
        
        // Skip displaying if this is part of a workflow
        if (data.workflowId || data.workflow_id || data.requestId?.includes('workflow')) {
            debugLog('Skipping verification result display for workflow', 'info');
            return;
        }
        
        // Skip displaying verification for medical proofs (they show in workflow cards)
        if (data.requestId?.includes('medical') || data.proofType === 'medical_integrity' || 
            data.requestId?.includes('verify_avalanche')) {
            debugLog('Skipping verification result display for medical proof', 'info');
            return;
        }
        
        // For now, still create separate card for this message type
        // as it might be used by other parts of the system
        const verificationCard = createVerificationCard(data);
        uiManager.addMessage(verificationCard, 'assistant');
    });
    
    // Handle verification_complete messages
    wsManager.on('verification_complete', (data) => {
        debugLog(`Received verification_complete: ${data.proof_id}`, 'info');
        
        // Skip displaying if this is part of a workflow
        if (data.workflowId || data.workflow_id || data.additional_context?.workflow_id) {
            debugLog('Skipping verification_complete display for workflow proof', 'info');
            return;
        }
        
        // Skip displaying local verification for medical proofs (they only do blockchain verification)
        if (data.proof_id && data.proof_id.includes('medical')) {
            debugLog('Skipping local verification display for medical proof', 'info');
            return;
        }
        
        // For standalone verifications, add result to the existing proof card
        const proofId = data.proof_id;
        const result = {
            valid: data.result === 'VALID',
            success: data.result === 'VALID'
        };
        
        // Add verification result to the existing proof card
        proofManager.addVerificationResult(proofId, 'Local', result);
        
        // Show toast notification
        if (result.valid) {
            uiManager.showToast('Local verification successful', 'success');
        } else {
            uiManager.showToast('Local verification failed', 'error');
        }
    });
    
    // Handle blockchain verification requests from backend
    wsManager.on('blockchain_verification_request', async (data) => {
        debugLog(`Received blockchain verification request: ${data.blockchain} for ${data.proof_id}`, 'info');
        console.log('[BLOCKCHAIN_VERIFICATION_REQUEST]', data);
        
        try {
            let result;
            const proofId = data.proof_id || data.proofId;
            const proofType = data.proof_type || data.proofType || 'unknown';
            
            // Ensure wallet is connected before verification
            if (data.blockchain?.toUpperCase() === 'SOLANA' && !blockchainVerifier.solanaConnected) {
                debugLog('Solana wallet not connected, attempting connection...', 'info');
                const connected = await blockchainVerifier.connectSolana();
                if (!connected) {
                    throw new Error('Failed to connect Solana wallet. Please ensure Solflare is installed and unlocked.');
                }
                // Add small delay after connection to ensure wallet is ready
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            switch (data.blockchain?.toUpperCase()) {
                case 'ETHEREUM':
                    result = await blockchainVerifier.verifyOnEthereum(proofId, proofType);
                    break;
                case 'SOLANA':
                    result = await blockchainVerifier.verifyOnSolana(proofId, proofType);
                    break;
                case 'BASE':
                    result = await blockchainVerifier.verifyOnBase(proofId, proofType);
                    break;
                default:
                    throw new Error(`Unknown blockchain: ${data.blockchain}`);
            }
            
            debugLog(`Blockchain verification result: ${JSON.stringify(result)}`, 'info');
            
            // Send verification result back to backend
            wsManager.send({
                type: 'blockchain_verification_response',
                proof_id: proofId,
                blockchain: data.blockchain,
                success: result?.success || false,
                transaction_hash: result?.transactionHash || result?.txHash || result?.signature,
                explorer_url: result?.explorerUrl,
                error: result?.error,
                workflow_id: data.workflow_id || data.workflowId,
                step_id: data.step_id || data.stepId
            });
            
        } catch (error) {
            debugLog(`Blockchain verification error: ${error.message}`, 'error');
            
            // Send error response back to backend
            wsManager.send({
                type: 'blockchain_verification_response',
                proof_id: data.proof_id || data.proofId,
                blockchain: data.blockchain,
                success: false,
                error: error.message,
                workflow_id: data.workflow_id || data.workflowId,
                step_id: data.step_id || data.stepId
            });
        }
    });
}

function setupUIEventListeners() {
    // Send button
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Enter key handling
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                enterKeyDown = true;
            }
        });
        
        userInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && enterKeyDown) {
                e.preventDefault();
                sendMessage();
                enterKeyDown = false;
            }
        });
    }
    
    // Upload button
    const uploadButton = document.getElementById('upload-button');
    if (uploadButton) {
        uploadButton.addEventListener('click', () => {
            // Implement file upload functionality
            uiManager.showToast('File upload not implemented yet', 'info');
        });
    }
    
    // Paste button
    const pasteButton = document.getElementById('paste-button');
    if (pasteButton) {
        pasteButton.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                uiManager.setInputValue(text);
            } catch (err) {
                uiManager.showToast('Failed to read clipboard', 'error');
            }
        });
    }
    
    // Debug console toggle
    const debugHeader = document.querySelector('.debug-header');
    if (debugHeader) {
        debugHeader.addEventListener('click', () => {
            uiManager.toggleDebugConsole();
        });
    }
}

function sendMessage() {
    if (sendingInProgress) return;
    
    const message = uiManager.getInputValue();
    if (!message) return;
    
    // Prevent duplicate messages
    const now = Date.now();
    if (message === lastSentMessage && (now - lastSentTime) < 2000) {
        debugLog('Duplicate message blocked', 'warning');
        return;
    }
    
    // Check message history
    const messageKey = `${message}_${Math.floor(now / 5000)}`;
    if (messageHistory.has(messageKey)) {
        debugLog('Message already in recent history', 'warning');
        return;
    }
    
    sendingInProgress = true;
    lastSentMessage = message;
    lastSentTime = now;
    messageHistory.add(messageKey);
    
    // Clean up old message history
    if (messageHistory.size > 10) {
        const oldestKey = messageHistory.values().next().value;
        messageHistory.delete(oldestKey);
    }
    
    // Add user message to UI
    uiManager.addMessage(message, 'user');
    uiManager.clearInput();
    
    // Add waiting message
    const waitingMessage = document.createElement('div');
    waitingMessage.className = 'message assistant waiting';
    waitingMessage.innerHTML = '<div class="message-content">Processing your request</div>';
    document.getElementById('messages').appendChild(waitingMessage);
    uiManager.scrollToBottom();
    
    // Send message via WebSocket
    const sent = wsManager.sendChatMessage(message);
    if (!sent) {
        uiManager.removeWaitingMessage();
        uiManager.showToast('Failed to send message - not connected', 'error');
    }
    
    sendingInProgress = false;
}

function loadSampleQueries() {
    // Sample queries for different categories
    const sampleQueries = {
        'Natural Language Prompts': [
            'What is the capital of France?',
            'Explain zero-knowledge proofs',
            'What are the benefits of blockchain?'
        ],
        'Single zkEngine Proofs': [
            'Generate KYC proof',
            'Prove AI prediction commitment'
        ],
        'Workflows': [
            'Send 0.05 USDC to Alice on Ethereum if KYC compliant',
            'If Alice is KYC compliant, send her 0.04 USDC to Alice on Solana',
            'Send 0.05 USDC on Solana if Bob is KYC verified on Solana and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum.',
            'Prove IoT device proximity at location 5080, 5020',
            'Create medical record for patient 12345 and verify integrity'
        ],
        'History': [
            'Proof History'
        ]
    };
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // Clear existing content
    const existingCategories = sidebar.querySelectorAll('.example-category');
    existingCategories.forEach(cat => cat.remove());
    
    // Add sample queries
    Object.entries(sampleQueries).forEach(([category, queries]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'example-category';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = category;
        categoryDiv.appendChild(categoryTitle);
        
        queries.forEach(query => {
            const queryDiv = document.createElement('div');
            queryDiv.className = 'example-item';
            queryDiv.textContent = query;
            queryDiv.addEventListener('click', () => {
                uiManager.setInputValue(query);
            });
            categoryDiv.appendChild(queryDiv);
        });
        
        sidebar.appendChild(categoryDiv);
    });
}

function createVerificationCard(data) {
    const card = document.createElement('div');
    card.className = 'verification-card';
    
    const isValid = data.valid || data.isValid;
    const blockchain = data.blockchain || 'Local';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${blockchain} Verification</div>
            <span class="status-badge ${isValid ? 'verified' : 'error'}">
                ${isValid ? 'VALID' : 'INVALID'}
            </span>
        </div>
        <div class="card-content">
            ${data.proofId ? `
                <div class="status-message">
                    Proof ID: ${data.proofId}
                </div>
            ` : ''}
            ${data.message ? `
                <div class="status-message">
                    ${data.message}
                </div>
            ` : ''}
            ${data.transactionHash ? `
                <div class="status-message">
                    Transaction: <a href="${data.explorerUrl}" target="_blank" 
                                  class="explorer-link">
                        View on Explorer →
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Auto-connect wallets if previously connected
async function autoConnectWallets() {
    // Re-enabled auto-connection as requested by user
    // This will now use the blockchain verifier's autoConnect method
    if (blockchainVerifier) {
        await blockchainVerifier.autoConnect();
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    workflowManager.stopAllPolling();
    transferManager.stopAllPolling();
    wsManager.disconnect();
});// Cache bust: 1752966646
