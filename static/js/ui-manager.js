// UI Manager - Handles all UI updates and DOM manipulation
import { debugLog } from './utils.js';

export class UIManager {
    constructor() {
        this.messagesContainer = null;
        this.debugConsole = null;
        this.connectionStatus = null;
    }

    init() {
        this.messagesContainer = document.getElementById('messages');
        this.debugConsole = document.getElementById('debug-console');
        this.connectionStatus = document.getElementById('connection-status');
    }

    addMessage(content, role = 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (role === 'user' && typeof content === 'string') {
            contentDiv.textContent = content;
        } else if (typeof content === 'string') {
            contentDiv.innerHTML = content;
        } else {
            contentDiv.appendChild(content);
        }
        
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        const container = document.querySelector('.messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
        
        return messageDiv;
    }

    removeWaitingMessage() {
        const waitingMessages = this.messagesContainer.querySelectorAll('.message.waiting');
        waitingMessages.forEach(msg => msg.remove());
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-weight: 500;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateConnectionStatus(status) {
        if (!this.connectionStatus) return;
        
        this.connectionStatus.className = `status ${status}`;
        const statusDot = this.connectionStatus.querySelector('.status-dot');
        const statusText = this.connectionStatus.querySelector('.status-text');
        
        switch(status) {
            case 'connected':
                statusText.textContent = 'Connected';
                debugLog('WebSocket connected', 'success');
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected';
                debugLog('WebSocket disconnected', 'error');
                break;
            case 'error':
                statusText.textContent = 'Connection Error';
                debugLog('WebSocket error', 'error');
                break;
            case 'connecting':
                statusText.textContent = 'Connecting...';
                debugLog('WebSocket connecting...', 'info');
                break;
        }
    }

    toggleDebugConsole() {
        if (this.debugConsole) {
            this.debugConsole.classList.toggle('minimized');
        }
    }

    clearMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }

    disableInput(disabled = true) {
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        
        if (userInput) userInput.disabled = disabled;
        if (sendButton) sendButton.disabled = disabled;
    }

    setInputValue(value) {
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.value = value;
            userInput.focus();
        }
    }

    getInputValue() {
        const userInput = document.getElementById('user-input');
        return userInput ? userInput.value.trim() : '';
    }

    clearInput() {
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.value = '';
        }
    }

    scrollToBottom() {
        const container = document.querySelector('.messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    updateProofCardStatus(proofId, statusBadge, statusText, statusClass) {
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
        if (!proofCard) return;

        const badge = proofCard.querySelector('.status-badge');
        if (badge) {
            badge.className = `status-badge ${statusClass}`;
            badge.textContent = statusText;
        }
    }

    updateWorkflowStepStatus(workflowId, stepId, status, statusText) {
        const stepElement = document.querySelector(`[data-workflow-id="${workflowId}"][data-step-id="${stepId}"]`);
        if (!stepElement) return;

        stepElement.className = `workflow-step ${status}`;
        
        const statusElement = stepElement.querySelector('.step-status');
        if (statusElement) {
            statusElement.textContent = statusText;
        }
    }

    addButtonLoadingState(button, loading = true) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
            button.textContent = 'Processing...';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }
}

// Add required styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .loading {
        position: relative;
        color: transparent !important;
    }
    .loading::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        margin: auto;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
    }
`;
document.head.appendChild(style);