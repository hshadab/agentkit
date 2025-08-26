// Mock WebSocket Server for UI compatibility
// This allows the UI to load without WebSocket errors

import { WebSocketServer } from 'ws';

const PORT = 8001;
const wss = new WebSocketServer({ port: PORT });

console.log(`🌐 Mock WebSocket server running on ws://localhost:${PORT}/ws`);

wss.on('connection', (ws, req) => {
    console.log('📡 New WebSocket connection from:', req.socket.remoteAddress);
    
    // Send initial connection message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to mock WebSocket server',
        timestamp: new Date().toISOString()
    }));
    
    // Handle messages from client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 Received message:', message.type || 'unknown');
            
            // Mock response for different message types
            if (message.type === 'health') {
                ws.send(JSON.stringify({
                    type: 'health_response',
                    status: 'healthy',
                    services: {
                        zkml: 'running',
                        gateway: 'available'
                    }
                }));
            } else {
                // Echo back with acknowledgment
                ws.send(JSON.stringify({
                    type: 'acknowledged',
                    originalMessage: message.type,
                    note: 'This is a mock server - use zkML commands directly in the UI'
                }));
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        console.log('👋 Client disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WebSocket server...');
    wss.close(() => {
        process.exit(0);
    });
});

console.log('ℹ️ This is a mock server for UI compatibility');
console.log('ℹ️ zkML commands are handled directly by the frontend');
console.log('ℹ️ Use the zkML sample queries in the left sidebar');