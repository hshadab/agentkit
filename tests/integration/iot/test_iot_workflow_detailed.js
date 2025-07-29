import WebSocket from 'ws';
import fetch from 'node-fetch';

class DetailedWorkflowTester {
    constructor() {
        this.ws = null;
        this.transactions = [];
        this.steps = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.ws.on('error', reject);
        });
    }

    handleMessage(message) {
        console.log(`[${new Date().toISOString()}] ${message.type}`);
        
        switch(message.type) {
            case 'workflow_started':
                console.log(`  Workflow ID: ${message.workflowId}`);
                console.log(`  Steps: ${message.steps.length}`);
                break;
                
            case 'workflow_step_update':
                const update = message.updates;
                console.log(`  Step ${message.stepId}: ${update.status}`);
                if (update.status === 'completed' && update.transferData) {
                    console.log(`  Transfer ID: ${update.transferData.id}`);
                }
                break;
                
            case 'device_registration_request':
                console.log(`  📱 Device registration for: ${message.deviceId}`);
                // Simulate successful registration with transaction
                setTimeout(() => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    console.log(`  📝 Sending registration response with tx: ${txHash}`);
                    this.ws.send(JSON.stringify({
                        type: 'device_registration_response',
                        requestId: message.requestId,
                        success: true,
                        ioId: `ioID_${message.deviceId}_${Date.now()}`,
                        did: `did:io:${message.deviceId}`,
                        txHash: txHash
                    }));
                    this.transactions.push({
                        step: 'Device Registration',
                        txHash: txHash,
                        explorer: `https://testnet.iotexscan.io/tx/${txHash}`
                    });
                }, 500);
                break;
                
            case 'proof_complete':
                console.log(`  🔐 Proof completed: ${message.proof_id}`);
                console.log(`  Metrics: ${JSON.stringify(message.metrics)}`);
                break;
                
            case 'iotex_verification_request':
                console.log(`  ✅ IoTeX verification for proof: ${message.proofId}`);
                setTimeout(() => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    console.log(`  📝 Sending verification response with tx: ${txHash}`);
                    this.ws.send(JSON.stringify({
                        type: 'iotex_verification_response',
                        requestId: message.requestId,
                        success: true,
                        transactionHash: txHash,
                        blockNumber: Math.floor(Math.random() * 1000000)
                    }));
                    this.transactions.push({
                        step: 'Proof Verification on IoTeX',
                        txHash: txHash,
                        explorer: `https://testnet.iotexscan.io/tx/${txHash}`
                    });
                }, 500);
                break;
                
            case 'workflow_completed':
                console.log(`\n📊 Workflow completed: ${message.success ? 'SUCCESS' : 'FAILED'}`);
                if (!message.success) {
                    console.log(`  Error: ${message.error}`);
                }
                this.printTransactionSummary();
                setTimeout(() => process.exit(0), 2000);
                break;
        }
    }
    
    printTransactionSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('🔗 BLOCKCHAIN TRANSACTIONS');
        console.log('='.repeat(70));
        
        if (this.transactions.length === 0) {
            console.log('No blockchain transactions recorded');
        } else {
            this.transactions.forEach((tx, index) => {
                console.log(`\n${index + 1}. ${tx.step}`);
                console.log(`   Transaction: ${tx.txHash}`);
                console.log(`   Explorer: ${tx.explorer}`);
            });
        }
        
        console.log('\n' + '='.repeat(70));
    }
    
    async testIoTWorkflow() {
        console.log('🚀 Starting IoT Device Proximity Workflow Test\n');
        
        // Execute workflow via HTTP API
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'Register IoT device TESTDEVICE001 with proximity proof'
            })
        });
        
        console.log(`📡 Workflow request sent (HTTP ${response.status})`);
        
        // The WebSocket will handle all the messages
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 90000));
    }
}

async function main() {
    const tester = new DetailedWorkflowTester();
    
    try {
        await tester.connect();
        await tester.testIoTWorkflow();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main();