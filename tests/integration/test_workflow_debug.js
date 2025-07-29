import WebSocket from 'ws';
import fetch from 'node-fetch';

// Track all messages
const messageLog = [];

class WorkflowDebugger {
    constructor() {
        this.ws = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                const timestamp = new Date().toISOString();
                messageLog.push({ timestamp, message });
                
                console.log(`[${timestamp}] ${message.type}`);
                
                // Handle specific message types
                switch(message.type) {
                    case 'iotex_verification_request':
                        console.log('  📋 Verification request received');
                        console.log('  Request ID:', message.requestId);
                        console.log('  Proof ID:', message.proofId);
                        console.log('  Has proofData:', !!message.proofData);
                        
                        // Don't send response - let's see what happens
                        console.log('  ⏸️  NOT sending response to see error source');
                        break;
                        
                    case 'workflow_step_update':
                        if (message.updates.status === 'failed') {
                            console.log('  ❌ Step failed:', message.stepId);
                            console.log('  Error:', message.updates.error);
                        }
                        break;
                        
                    case 'workflow_completed':
                        if (!message.success) {
                            console.log('\n📋 Full message log:');
                            messageLog.forEach(log => {
                                console.log(`[${log.timestamp}] ${log.message.type}`);
                                if (log.message.error) {
                                    console.log('  Error:', log.message.error);
                                }
                            });
                        }
                        setTimeout(() => process.exit(0), 1000);
                        break;
                        
                    case 'device_registration_request':
                        // Auto-respond to keep workflow going
                        setTimeout(() => {
                            this.ws.send(JSON.stringify({
                                type: 'device_registration_response',
                                requestId: message.requestId,
                                success: true,
                                ioId: `ioID_${message.deviceId}_${Date.now()}`,
                                did: `did:io:${message.deviceId}`,
                                txHash: '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0')
                            }));
                        }, 100);
                        break;
                }
            });
            
            this.ws.on('error', reject);
        });
    }
    
    async testWorkflow() {
        console.log('🚀 Starting workflow debug test\n');
        
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'Register IoT device DEBUG001 with proximity proof'
            })
        });
        
        console.log(`📡 Workflow request sent (HTTP ${response.status})\n`);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 90000));
    }
}

async function main() {
    const tester = new WorkflowDebugger();
    
    try {
        await tester.connect();
        await tester.testWorkflow();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main();