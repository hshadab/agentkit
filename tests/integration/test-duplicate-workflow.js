#!/usr/bin/env node

// Test script to send a conditional transfer command and monitor for duplicates

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('[TEST] WebSocket connected');
    
    // Wait a bit for connection to stabilize
    setTimeout(() => {
        const testCommand = "Send 0.1 USDC to Alice on Ethereum if KYC compliant";
        const timestamp = new Date().toISOString();
        
        console.log(`[TEST] Sending command at ${timestamp}: "${testCommand}"`);
        
        ws.send(JSON.stringify({
            type: 'query',
            content: testCommand,
            timestamp: Date.now()
        }));
        
        console.log('[TEST] Command sent. Monitor the logs for duplicates.');
    }, 1000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data);
        const timestamp = new Date().toISOString();
        
        // Log relevant messages
        if (msg.type === 'workflow_started') {
            console.log(`[TEST RESPONSE] ${timestamp} - Workflow started: ${msg.workflowId}`);
        } else if (msg.type === 'chat_response') {
            console.log(`[TEST RESPONSE] ${timestamp} - Chat response received`);
            if (msg.command) {
                console.log(`  Command: ${msg.command}`);
            }
        } else if (msg.type === 'proof_status' || msg.type === 'proof_generation') {
            console.log(`[TEST RESPONSE] ${timestamp} - ${msg.type}: ${msg.proof_id || msg.proofId}`);
        }
    } catch (e) {
        console.error('[TEST ERROR] Failed to parse message:', e);
    }
});

ws.on('error', (error) => {
    console.error('[TEST ERROR] WebSocket error:', error);
});

ws.on('close', () => {
    console.log('[TEST] WebSocket closed');
    process.exit(0);
});

// Close after 30 seconds
setTimeout(() => {
    console.log('[TEST] Test complete. Closing connection.');
    ws.close();
}, 30000);