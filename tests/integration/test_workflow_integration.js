import WebSocket from 'ws';
import fetch from 'node-fetch';

class WorkflowTester {
    constructor() {
        this.ws = null;
        this.responses = new Map();
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket server');
                this.connected = true;
                resolve();
            });
            
            this.ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                console.log(`📨 Received: ${message.type}`);
                
                // Handle different message types
                switch(message.type) {
                    case 'workflow_started':
                        console.log(`   Workflow ${message.workflowId} started with ${message.steps.length} steps`);
                        break;
                        
                    case 'workflow_step_update':
                        console.log(`   Step ${message.stepId}: ${message.updates.status}`);
                        break;
                        
                    case 'device_registration_request':
                        console.log(`   Device registration requested for ${message.deviceId}`);
                        // Simulate UI responding to device registration
                        this.ws.send(JSON.stringify({
                            type: 'device_registration_response',
                            requestId: message.requestId,
                            success: true,
                            ioId: `ioID_${message.deviceId}_${Date.now()}`,
                            did: `did:io:${message.deviceId}`,
                            txHash: '0x' + 'a'.repeat(64)
                        }));
                        break;
                        
                    case 'iotex_verification_request':
                        console.log(`   IoTeX verification requested for ${message.proofId}`);
                        // Simulate UI responding to verification
                        this.ws.send(JSON.stringify({
                            type: 'iotex_verification_response',
                            requestId: message.requestId,
                            success: true,
                            transactionHash: '0x' + 'b'.repeat(64),
                            blockNumber: 12345
                        }));
                        break;
                        
                    case 'blockchain_verification_request':
                        console.log(`   Blockchain verification requested for ${message.proofId} on ${message.blockchain}`);
                        // Simulate UI responding to blockchain verification
                        this.ws.send(JSON.stringify({
                            type: 'blockchain_verification_response',
                            workflowId: message.workflowId,
                            proofId: message.proofId,
                            blockchain: message.blockchain,
                            transaction_hash: '0x' + 'c'.repeat(64),
                            explorer_url: `https://etherscan.io/tx/0x${'c'.repeat(64)}`
                        }));
                        break;
                        
                    case 'workflow_completed':
                        console.log(`   Workflow completed: ${message.success ? 'SUCCESS' : 'FAILED'}`);
                        if (message.proofSummary) {
                            console.log(`   Proofs: ${JSON.stringify(message.proofSummary)}`);
                        }
                        break;
                }
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });
            
            this.ws.on('close', () => {
                console.log('🔌 WebSocket disconnected');
                this.connected = false;
            });
        });
    }

    async testWorkflow(command) {
        console.log(`\n🧪 Testing: "${command}"`);
        
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        const result = await response.json();
        console.log(`📊 Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
        
        // Wait a bit for all messages to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return result;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function runTests() {
    const tester = new WorkflowTester();
    
    try {
        await tester.connect();
        
        // Test 1: IoT Device Registration
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: IoT Device Registration and Proximity Proof');
        console.log('='.repeat(60));
        await tester.testWorkflow('Register IoT device DEV123 with proximity proof');
        
        // Test 2: KYC Proof
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: KYC Proof Generation');
        console.log('='.repeat(60));
        await tester.testWorkflow('Generate KYC proof for Alice');
        
        // Test 3: Location Proof
        console.log('\n' + '='.repeat(60));
        console.log('TEST 3: Location Proof Generation');
        console.log('='.repeat(60));
        await tester.testWorkflow('Generate location proof for Bob');
        
        // Test 4: Combined Workflow
        console.log('\n' + '='.repeat(60));
        console.log('TEST 4: Combined KYC and Transfer');
        console.log('='.repeat(60));
        await tester.testWorkflow('Generate KYC proof then send 0.1 USDC to Alice');
        
        // Test 5: Multi-condition Workflow
        console.log('\n' + '='.repeat(60));
        console.log('TEST 5: Multi-condition Transfer');
        console.log('='.repeat(60));
        await tester.testWorkflow('Send 0.5 USDC to Alice if KYC verified and send 0.3 USDC to Bob if location verified');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        tester.disconnect();
    }
}

runTests().catch(console.error);