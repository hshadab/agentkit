#!/usr/bin/env node

import WebSocket from 'ws';

// Connect to the Rust WebSocket server
const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('Connected to WebSocket server');
    
    // Send a workflow command
    setTimeout(() => {
        console.log('Sending workflow command...');
        ws.send(JSON.stringify({
            type: 'execute_workflow',
            command: 'Generate KYC proof then send 0.01 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f5b3e3'
        }));
    }, 1000);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('\nReceived message:');
        console.log('Type:', message.type);
        
        if (message.type === 'workflow_started') {
            console.log('Workflow ID:', message.workflowId);
            console.log('Steps:', message.steps?.length || 0);
            message.steps?.forEach((step, i) => {
                console.log(`  ${i+1}. ${step.action} - ${step.status}`);
            });
        } else if (message.type === 'workflow_step_update') {
            console.log('Step update:', message.stepId, '->', message.updates?.status);
        } else if (message.type === 'workflow_completed') {
            console.log('Workflow completed:', message.success ? 'SUCCESS' : 'FAILED');
            if (message.error) {
                console.log('Error:', message.error);
            }
        }
    } catch (e) {
        console.log('Raw message:', data);
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
    process.exit(0);
});

// Keep the script running
setTimeout(() => {
    console.log('\nTest complete');
    ws.close();
}, 30000);