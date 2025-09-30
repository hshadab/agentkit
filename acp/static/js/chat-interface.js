/**
 * Chat Interface
 * Handles message rendering, user input, and conversation flow
 */

class ChatInterface {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.conversationId = 'conv_' + Date.now();

        this.messagesContainer = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');

        this.init();
    }

    init() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Send message on Enter key
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Show welcome message
        this.addAgentMessage("Hi! I'm your AI shopping assistant. What are you looking for today?");
        this.showSuggestions([
            "Running shoes under $100",
            "Ceramic mugs for gifts",
            "Tech books about AI",
            "Organic groceries"
        ]);
    }

    /**
     * Send user message
     */
    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || this.isTyping) return;

        // Add user message
        this.addUserMessage(text);
        this.messageInput.value = '';
        this.sendBtn.disabled = true;

        // Show typing indicator
        this.showTyping();

        try {
            // TODO: Send to backend in Phase 2
            // For now, simulate response
            await this.simulateResponse(text);
        } catch (error) {
            console.error('Error sending message:', error);
            this.addSystemMessage('Sorry, something went wrong. Please try again.');
        } finally {
            this.hideTyping();
            this.sendBtn.disabled = false;
        }
    }

    /**
     * Simulate agent response (temporary - will be replaced with real backend)
     */
    async simulateResponse(userMessage) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('shoes') || lowerMessage.includes('running')) {
            this.addAgentMessage("Great! I'm searching for running shoes in your budget...");
            await new Promise(resolve => setTimeout(resolve, 800));
            this.addAgentMessage("I found 3 highly-rated running shoes for you. In Phase 2, product cards will appear here!");
        } else if (lowerMessage.includes('ceramic') || lowerMessage.includes('mug')) {
            this.addAgentMessage("Looking for ceramic products...");
            await new Promise(resolve => setTimeout(resolve, 800));
            this.addAgentMessage("I found some beautiful handmade ceramics! Product cards coming in Phase 2.");
        } else if (lowerMessage.includes('book')) {
            this.addAgentMessage("Searching for books...");
            await new Promise(resolve => setTimeout(resolve, 800));
            this.addAgentMessage("I found some great tech books. Product display coming in Phase 2!");
        } else if (lowerMessage.includes('rules') || lowerMessage.includes('budget')) {
            this.addAgentMessage("I can help you set up spending rules. What's your monthly budget?");
        } else {
            this.addAgentMessage(`I understand you're looking for: "${userMessage}". Product search will be implemented in Phase 2!`);
            this.showSuggestions([
                "Show me popular products",
                "Set up spending rules",
                "Tell me about zkML verification"
            ]);
        }
    }

    /**
     * Add user message to chat
     */
    addUserMessage(text) {
        const message = {
            type: 'user',
            content: text,
            timestamp: new Date()
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    /**
     * Add agent message to chat
     */
    addAgentMessage(text, options = {}) {
        const message = {
            type: 'agent',
            content: text,
            timestamp: new Date(),
            ...options
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        return message;
    }

    /**
     * Add system message (errors, notifications)
     */
    addSystemMessage(text) {
        const message = {
            type: 'system',
            content: text,
            timestamp: new Date()
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    /**
     * Render a message in the UI
     */
    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;

        if (message.type === 'user') {
            messageDiv.innerHTML = `
                <div class="content">
                    <p>${this.escapeHtml(message.content)}</p>
                </div>
                <div class="avatar">👤</div>
            `;
        } else if (message.type === 'agent') {
            messageDiv.innerHTML = `
                <div class="avatar">🤖</div>
                <div class="content">
                    <p>${this.escapeHtml(message.content)}</p>
                    ${message.products ? '<div class="product-cards-container"></div>' : ''}
                </div>
            `;
        } else if (message.type === 'system') {
            messageDiv.innerHTML = `
                <div class="avatar">ℹ️</div>
                <div class="content">
                    <p>${this.escapeHtml(message.content)}</p>
                </div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
    }

    /**
     * Show typing indicator
     */
    showTyping() {
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message agent';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTyping() {
        this.isTyping = false;
        const typingDiv = document.getElementById('typingIndicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    /**
     * Show suggestion pills
     */
    showSuggestions(suggestions) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'message agent';
        suggestionsDiv.innerHTML = `
            <div class="avatar">💡</div>
            <div class="content">
                <p style="margin-bottom: 12px;">Try asking:</p>
                <div class="suggestion-pills">
                    ${suggestions.map(s => `
                        <div class="suggestion-pill" data-suggestion="${this.escapeHtml(s)}">
                            ${this.escapeHtml(s)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(suggestionsDiv);

        // Add click handlers
        suggestionsDiv.querySelectorAll('.suggestion-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this.messageInput.value = pill.dataset.suggestion;
                this.sendMessage();
            });
        });

        this.scrollToBottom();
    }

    /**
     * Scroll to bottom of chat
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messages = [];
        this.messagesContainer.innerHTML = '';
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.messages;
    }
}

// Initialize chat interface when DOM is ready
let chatInterface;
document.addEventListener('DOMContentLoaded', () => {
    chatInterface = new ChatInterface();
});