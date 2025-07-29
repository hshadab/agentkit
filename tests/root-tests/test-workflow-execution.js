#!/usr/bin/env node

import WebSocket from 'ws';

// Simple test to verify workflow messages are being sent

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('Connected to WebSocket server');
    
    // Send a test workflow_started message
    const testMessage = {
        type: 'workflow_started',
        workflowId: 'test_workflow_123',
        steps: [
            {
                id: 'step_1',
                action: 'register_device',
                description: 'Register IoT device TEST123',
                status: 'pending'
            },
            {
                id: 'step_2', 
                action: 'generate_proof',
                description: 'Generate device proximity proof',
                status: 'pending'
            }
        ]
    };
    
    console.log('Sending test workflow_started:', JSON.stringify(testMessage, null, 2));
    ws.send(JSON.stringify(testMessage));
    
    // Send step update after a delay
    setTimeout(() => {
        const updateMessage = {
            type: 'workflow_step_update',
            workflowId: 'test_workflow_123',
            stepId: 'step_1',
            updates: {
                status: 'executing',
                startTime: Date.now()
            }
        };
        console.log('Sending test workflow_step_update:', JSON.stringify(updateMessage, null, 2));
        ws.send(JSON.stringify(updateMessage));
    }, 1000);
    
    // Complete the step after another delay
    setTimeout(() => {
        const completeMessage = {
            type: 'workflow_step_update',
            workflowId: 'test_workflow_123',
            stepId: 'step_1',
            updates: {
                status: 'completed',
                endTime: Date.now()
            }
        };
        console.log('Sending test step completion:', JSON.stringify(completeMessage, null, 2));
        ws.send(JSON.stringify(completeMessage));
    }, 2000);
    
    // Close after 3 seconds
    setTimeout(() => {
        ws.close();
        console.log('Test complete');
    }, 3000);
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', () => {
    console.log('WebSocket closed');
    process.exit(0);
});