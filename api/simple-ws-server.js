#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');

const PORT = 8001;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
});

console.log(`🚀 WebSocket server starting on port ${PORT}...`);

wss.on('connection', (ws) => {
    console.log('✅ Client connected');
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📥 Received:', message.message);
            
            // Handle proof-related messages
            if (message.message && message.message.toLowerCase().includes('proof')) {
                ws.send(JSON.stringify({
                    type: 'info',
                    message: 'For zkML Gateway workflows, please use the Gateway prompts in the sidebar.'
                }));
            } else {
                // Echo back a simple response
                ws.send(JSON.stringify({
                    type: 'response',
                    message: `Received: ${message.message}`
                }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing request'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('👋 Client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

server.listen(PORT, () => {
    console.log(`✅ WebSocket server running on ws://localhost:${PORT}/ws`);
    console.log('📋 Ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...');
    server.close(() => {
        process.exit(0);
    });
});