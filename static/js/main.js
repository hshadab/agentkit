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
});

function setupMessageHandlers() {
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
    
    wsManager.on('proof_generation_complete', (data) => {
        debugLog('Proof generation complete', 'success');
        proofManager.updateProofCard(data.proofId, 'complete', data);
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
        'Proof Generation': [
            'Generate a proof that 15 * 7 = 105',
            'Create a zero-knowledge proof for age > 18',
            'Generate proof of balance > 1000'
        ],
        'Verification': [
            'Show my proof history',
            'Verify my last proof',
            'Check proof status'
        ],
        'Transfers': [
            'Send 10 USDC to alice@example.com',
            'Transfer 5 USDC to bob@example.com if proof is valid',
            'Send payment after verification'
        ],
        'Complex Workflows': [
            'Generate age proof and send 50 USDC to alice@example.com if valid',
            'Create KYC proof then transfer 100 USDC to multiple recipients',
            'Verify identity and process payment'
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    workflowManager.stopAllPolling();
    transferManager.stopAllPolling();
    wsManager.disconnect();
});