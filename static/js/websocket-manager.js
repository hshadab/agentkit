// WebSocket Manager - Handles all WebSocket communication
import { config } from './config.js';
import { debugLog } from './utils.js';

export class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectInterval = null;
        this.reconnectAttempts = 0;
        this.messageHandlers = new Map();
        this.connectionHandlers = {
            onConnect: null,
            onDisconnect: null,
            onError: null
        };
    }

    setConnectionHandlers(handlers) {
        Object.assign(this.connectionHandlers, handlers);
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            debugLog('WebSocket already connected', 'info');
            return;
        }

        try {
            this.ws = new WebSocket(config.websocket.url);
            
            this.ws.onopen = () => {
                debugLog('WebSocket connection established', 'success');
                this.reconnectAttempts = 0;
                
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
                
                if (this.connectionHandlers.onConnect) {
                    this.connectionHandlers.onConnect();
                }
                
                // Send initial connection message if needed
                this.send({ type: 'init', client: 'agentkit-ui' });
            };

            this.ws.onmessage = (event) => {
                try {
                    debugLog(`Raw WebSocket message: ${event.data}`, 'debug');
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    debugLog(`Error parsing message: ${error.message}`, 'error');
                    debugLog(`Raw message was: ${event.data}`, 'error');
                }
            };

            this.ws.onerror = (error) => {
                debugLog(`WebSocket error: ${error}`, 'error');
                if (this.connectionHandlers.onError) {
                    this.connectionHandlers.onError(error);
                }
            };

            this.ws.onclose = () => {
                debugLog('WebSocket connection closed', 'warning');
                if (this.connectionHandlers.onDisconnect) {
                    this.connectionHandlers.onDisconnect();
                }
                this.scheduleReconnect();
            };

        } catch (error) {
            debugLog(`Failed to create WebSocket: ${error.message}`, 'error');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectInterval) return;
        
        if (this.reconnectAttempts < config.websocket.maxReconnectAttempts) {
            this.reconnectAttempts++;
            debugLog(`Scheduling reconnect attempt ${this.reconnectAttempts}...`, 'info');
            
            this.reconnectInterval = setInterval(() => {
                if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                    this.connect();
                }
            }, config.websocket.reconnectDelay);
        } else {
            debugLog('Max reconnection attempts reached', 'error');
        }
    }

    disconnect() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    handleMessage(data) {
        debugLog(`Received message type: ${data.type}`, 'info');
        
        // Call registered handlers for this message type
        if (this.messageHandlers.has(data.type)) {
            const handlers = this.messageHandlers.get(data.type);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    debugLog(`Handler error for ${data.type}: ${error.message}`, 'error');
                }
            });
        }
        
        // Call wildcard handlers
        if (this.messageHandlers.has('*')) {
            const handlers = this.messageHandlers.get('*');
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    debugLog(`Wildcard handler error: ${error.message}`, 'error');
                }
            });
        }
    }

    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            debugLog('WebSocket not connected, cannot send message', 'error');
            return false;
        }

        try {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            this.ws.send(messageStr);
            debugLog(`Sent message: ${messageStr}`, 'info');
            return true;
        } catch (error) {
            debugLog(`Error sending message: ${error.message}`, 'error');
            return false;
        }
    }

    sendChatMessage(content) {
        return this.send({
            type: 'chat',
            content: content
        });
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getReadyState() {
        if (!this.ws) return WebSocket.CLOSED;
        return this.ws.readyState;
    }
}