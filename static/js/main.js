// Main application entry point
import { config } from './config.js';
import { WebSocketManager } from './websocket-manager.js';
import { UIManager } from './ui-manager.js';
import { ProofManager } from './proof-manager.js';
import { WorkflowManager } from './workflow-manager.js';
import { TransferManager } from './transfer-manager.js';
import { BlockchainVerifier } from './blockchain-verifier.js';
import { debugLog } from './utils.js';

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

// Make some functions globally accessible for onclick handlers
window.proofManager = proofManager;
window.blockchainVerifier = blockchainVerifier;
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

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    debugLog('Initializing AgentKit UI...', 'info');
    
    // Initialize UI manager
    uiManager.init();
    
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
    autoConnectWallets();
});

function setupMessageHandlers() {
    // Debug handler to log all messages
    wsManager.on('*', (data) => {
        debugLog(`WebSocket message received: type=${data.type || 'NO_TYPE'}, data=${JSON.stringify(data)}`, 'debug');
        
        // Special handling for messages without a type field
        if (!data.type && data.proof_id) {
            debugLog('Detected proof message without type field', 'warning');
        }
    });
    
    // Handle general messages
    wsManager.on('message', (data) => {
        debugLog(`Received message: ${data.content}`, 'info');
        uiManager.removeWaitingMessage();
        uiManager.addMessage(data.content, 'assistant');
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
        debugLog('Proof generation started', 'info');
        const proofCard = proofManager.addProofCard({
            ...data,
            status: 'generating'
        });
        uiManager.addMessage(proofCard, 'assistant');
    });
    
    // Also handle alternative message types
    wsManager.on('proof_started', (data) => {
        debugLog('Proof started (alternative type)', 'info');
        const proofCard = proofManager.addProofCard({
            ...data,
            proofId: data.proof_id || data.proofId,
            status: 'generating'
        });
        uiManager.addMessage(proofCard, 'assistant');
    });
    
    wsManager.on('proof_generation_complete', (data) => {
        debugLog('Proof generation complete', 'success');
        proofManager.updateProofCard(data.proofId, 'complete', data);
        uiManager.showToast('Proof generated successfully!', 'success');
    });
    
    // Alternative completion message type
    wsManager.on('proof_complete', (data) => {
        debugLog('Proof complete (alternative type)', 'success');
        const proofId = data.proof_id || data.proofId;
        proofManager.updateProofCard(proofId, 'complete', data);
        uiManager.showToast('Proof generated successfully!', 'success');
    });
    
    wsManager.on('proof_generation_failed', (data) => {
        debugLog('Proof generation failed', 'error');
        proofManager.updateProofCard(data.proofId, 'error', data);
        uiManager.showToast('Proof generation failed', 'error');
    });
    
    // Handle workflow updates
    wsManager.on('workflow_started', (data) => {
        debugLog(`Workflow started: ${data.workflow_id}`, 'info');
        
        // Store any pending AI response
        if (data.ai_response) {
            pendingAIResponses.set(data.workflow_id, data.ai_response);
        }
        
        const workflowCard = workflowManager.addWorkflowCard(data);
        uiManager.addMessage(workflowCard, 'assistant');
        
        // Show AI response after workflow card if exists
        const aiResponse = pendingAIResponses.get(data.workflow_id);
        if (aiResponse) {
            uiManager.addMessage(aiResponse, 'assistant');
            pendingAIResponses.delete(data.workflow_id);
        }
    });
    
    wsManager.on('workflow_step_update', (data) => {
        debugLog(`Workflow step update: ${data.workflow_id}/${data.step_id}`, 'info');
        workflowManager.updateWorkflowStep(data.workflow_id, data.step_id, data.updates);
    });
    
    wsManager.on('workflow_completed', (data) => {
        debugLog(`Workflow completed: ${data.workflow_id}`, 'success');
        workflowManager.updateWorkflowStatus(data.workflow_id, 'completed');
        uiManager.showToast('Workflow completed successfully!', 'success');
    });
    
    wsManager.on('workflow_failed', (data) => {
        debugLog(`Workflow failed: ${data.workflow_id}`, 'error');
        workflowManager.updateWorkflowStatus(data.workflow_id, 'failed');
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
    
    // Handle verification results
    wsManager.on('verification_result', (data) => {
        debugLog('Received verification result', 'info');
        const verificationCard = createVerificationCard(data);
        uiManager.addMessage(verificationCard, 'assistant');
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
            'Prove AI content authenticity',
            'Prove location: NYC (40.7°, -74.0°)'
        ],
        'Workflows': [
            'Send 0.05 USDC to Alice on Ethereum if KYC compliant',
            'If Alice is KYC compliant, send her 0.04 USDC to Alice on Solana',
            'Send 0.05 USDC on Solana if Bob is KYC verified on Solana and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum.',
            'Generate a KYC proof for Bob then if Bob\'s wallet is KYC verified generate a NYC proof of location and if verified on Solana send him 0.03 USDC on Solana.'
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
    // Check if MetaMask was previously connected
    if (localStorage.getItem('ethereum-connected') === 'true' && typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await blockchainVerifier.connectEthereum();
                debugLog('Auto-connected to Ethereum wallet', 'success');
                // Show wallet status indicator
                const statusIndicator = document.getElementById('eth-wallet-status');
                if (statusIndicator) statusIndicator.style.display = 'inline-block';
            } else {
                // Show connect banner if not connected
                const banner = document.getElementById('eth-connect-banner');
                if (banner) banner.style.display = 'flex';
            }
        } catch (error) {
            debugLog('Failed to auto-connect Ethereum wallet', 'error');
            const banner = document.getElementById('eth-connect-banner');
            if (banner) banner.style.display = 'flex';
        }
    } else {
        // Show connect banner if never connected
        const banner = document.getElementById('eth-connect-banner');
        if (banner) banner.style.display = 'flex';
    }
    
    // Check if Solflare/Phantom was previously connected
    if (localStorage.getItem('solana-connected') === 'true') {
        // Try Solflare first, then other wallets
        let wallet = null;
        let walletName = '';
        
        if (window.solflare && window.solflare.isSolflare) {
            wallet = window.solflare;
            walletName = 'Solflare';
        } else if (window.solana && window.solana.isPhantom) {
            wallet = window.solana;
            walletName = 'Phantom';
        } else if (window.solana) {
            wallet = window.solana;
            walletName = 'Solana';
        }
        
        if (wallet) {
            try {
                // Try to connect silently (most wallets support this)
                if (wallet.connect) {
                    const resp = await wallet.connect({ onlyIfTrusted: true });
                    if (resp.publicKey) {
                        blockchainVerifier.solanaWallet = resp.publicKey.toString();
                        blockchainVerifier.solanaConnected = true;
                        blockchainVerifier.connectedWallet = wallet;
                        debugLog(`Auto-connected to ${walletName} wallet`, 'success');
                        const banner = document.getElementById('sol-connect-banner');
                        if (banner) banner.style.display = 'none';
                        // Show wallet status indicator
                        const statusIndicator = document.getElementById('sol-wallet-status');
                        if (statusIndicator) statusIndicator.style.display = 'inline-block';
                    } else {
                        throw new Error('No public key');
                    }
                }
            } catch (error) {
                debugLog(`Failed to auto-connect ${walletName} wallet`, 'error');
                const banner = document.getElementById('sol-connect-banner');
                if (banner) banner.style.display = 'flex';
            }
        } else {
            // Show connect banner if no wallet found
            const banner = document.getElementById('sol-connect-banner');
            if (banner) banner.style.display = 'flex';
        }
    } else {
        // Show connect banner if never connected
        const banner = document.getElementById('sol-connect-banner');
        if (banner) banner.style.display = 'flex';
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    workflowManager.stopAllPolling();
    transferManager.stopAllPolling();
    wsManager.disconnect();
});