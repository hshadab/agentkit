// Main application entry point
// Cache bust: 20250120-1
import { config } from './config.js?v=20250120-1';
import { WebSocketManager } from './websocket-manager.js?v=20250120-1';
import { UIManager } from './ui-manager.js?v=20250120-1';
import { ProofManager } from './proof-manager.js?v=20250120-1';
import { WorkflowManager } from './workflow-manager.js?v=20250120-1';
import { TransferManager } from './transfer-manager.js?v=20250120-1';
import { BlockchainVerifier } from './blockchain-verifier.js?v=20250120-1';
import { debugLog } from './utils.js?v=20250120-1';

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
    // Disabled - BlockchainVerifier handles auto-connect in its constructor
    // autoConnectWallets();
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
    
    // Handle chat_response messages (what the server actually sends)
    wsManager.on('chat_response', (data) => {
        debugLog(`Received chat response: ${data.response}`, 'info');
        uiManager.removeWaitingMessage();
        
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
        
        // Only show proof card for standalone proofs
        if (!isPartOfWorkflow) {
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
        
        // Only show proof card for standalone proofs
        if (!isPartOfWorkflow) {
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
            
            // A proof is part of a workflow only if:
            // 1. It has a workflow ID AND
            // 2. That workflow has been started (exists in workflowStates)
            const isPartOfWorkflow = activeWorkflowId && workflowManager.workflowStates.has(activeWorkflowId);
            
            console.log('[PROOF_STATUS_DEBUG] activeWorkflowId:', activeWorkflowId);
            console.log('[PROOF_STATUS_DEBUG] isPartOfWorkflow:', isPartOfWorkflow);
            
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
            
            // Only show proof card for standalone proofs or workflows that haven't been "started"
            if (!isPartOfWorkflow) {
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
        } else {
            console.log('[PROOF_STATUS_DEBUG] Ignoring non-generating status:', data.status);
        }
    });
    
    wsManager.on('proof_generation_complete', (data) => {
        debugLog('Proof generation complete', 'success');
        console.log('[HANDLER] proof_generation_complete triggered for:', data.proofId);
        // Update the existing proof card
        proofManager.updateProofCard(data.proofId, 'complete', data);
        // Silent success - proof card shows completion
    });
    
    // Alternative completion message type
    wsManager.on('proof_complete', (data) => {
        debugLog('Proof complete (alternative type)', 'success');
        console.log('[HANDLER] proof_complete triggered for:', data.proof_id || data.proofId);
        console.log('[HANDLER] proof_complete data:', data);
        const proofId = data.proof_id || data.proofId;
        
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
    wsManager.on('workflow_started', (data) => {
        // Handle both workflow_id and workflowId formats
        data.workflow_id = data.workflow_id || data.workflowId;
        debugLog(`Workflow started: ${data.workflow_id}`, 'info');
        console.log('[WORKFLOW_DEBUG] Workflow started:', data.workflow_id);
        console.log('[WORKFLOW_DEBUG] Steps:', data.steps);
        
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
             steps[0].type === 'proof_generation');
        
        const isListOperation = steps.length === 1 && 
            (steps[0].action === 'list_proofs' || 
             steps[0].type === 'list_proofs' ||
             steps[0].description?.toLowerCase().includes('list proofs'));
        
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
        workflowManager.updateWorkflowStep(data.workflow_id, data.step_id, data.updates);
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
            'Prove AI prediction commitment',
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
});// Cache bust: 1752966646
