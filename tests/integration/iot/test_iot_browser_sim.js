import WebSocket from 'ws';
import fetch from 'node-fetch';

// Simulate browser environment
global.window = {
    proofManager: {
        proofs: new Map()
    },
    iotexDeviceVerifier: {
        verifyDeviceProximity: async (deviceId, x, y, proofData) => {
            console.log(`📍 Verifying device ${deviceId} at (${x}, ${y})`);
            // Simulate successful verification with transaction
            return {
                success: true,
                txHash: '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0'),
                blockNumber: Math.floor(Math.random() * 1000000)
            };
        }
    }
};

class BrowserSimulatedTester {
    constructor() {
        this.ws = null;
        this.transactions = [];
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
                message.steps.forEach((step, i) => {
                    console.log(`    ${i+1}. ${step.action} (${step.status})`);
                });
                break;
                
            case 'workflow_step_update':
                const update = message.updates;
                console.log(`  Step ${message.stepId}: ${update.status}`);
                if (update.txHash) {
                    console.log(`  Transaction: ${update.txHash}`);
                    this.transactions.push({
                        step: message.stepId,
                        txHash: update.txHash,
                        explorer: `https://testnet.iotexscan.io/tx/${update.txHash}`
                    });
                }
                break;
                
            case 'device_registration_request':
                console.log(`  📱 Device registration for: ${message.deviceId}`);
                // Simulate successful registration
                setTimeout(async () => {
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
                // Store proof data in simulated browser environment
                if (global.window.proofManager && message.proof_id) {
                    global.window.proofManager.proofs.set(message.proof_id, message);
                }
                break;
                
            case 'iotex_verification_request':
                console.log(`  ✅ IoTeX verification for proof: ${message.proofId}`);
                setTimeout(async () => {
                    try {
                        // Use proofData from message or from simulated storage
                        const proofData = message.proofData || global.window.proofManager.proofs.get(message.proofId);
                        
                        let x = 5050, y = 5050;
                        if (proofData?.public_inputs?.length >= 3) {
                            x = proofData.public_inputs[1] || 5050;
                            y = proofData.public_inputs[2] || 5050;
                        } else if (proofData?.inputs?.length >= 3) {
                            x = proofData.inputs[1] || 5050;
                            y = proofData.inputs[2] || 5050;
                        }
                        
                        const result = await global.window.iotexDeviceVerifier.verifyDeviceProximity(
                            message.deviceId || 'DEV123',
                            x,
                            y,
                            proofData
                        );
                        
                        console.log(`  📝 Sending verification response with tx: ${result.txHash}`);
                        this.ws.send(JSON.stringify({
                            type: 'iotex_verification_response',
                            requestId: message.requestId,
                            success: result.success,
                            transactionHash: result.txHash,
                            blockNumber: result.blockNumber
                        }));
                        
                        this.transactions.push({
                            step: 'Proof Verification on IoTeX',
                            txHash: result.txHash,
                            explorer: `https://testnet.iotexscan.io/tx/${result.txHash}`
                        });
                    } catch (error) {
                        console.error('  ❌ Verification error:', error.message);
                        this.ws.send(JSON.stringify({
                            type: 'iotex_verification_response',
                            requestId: message.requestId,
                            success: false,
                            error: error.message
                        }));
                    }
                }, 500);
                break;
                
            case 'blockchain_verification_request':
                console.log(`  💎 Blockchain verification request`);
                // Simulate USDC transfer
                setTimeout(() => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    console.log(`  📝 Sending blockchain verification with tx: ${txHash}`);
                    this.ws.send(JSON.stringify({
                        type: 'blockchain_verification_response',
                        requestId: message.requestId,
                        success: true,
                        transferData: {
                            id: `transfer_${Date.now()}`,
                            amount: '1.00',
                            currency: 'USD',
                            transactionHash: txHash,
                            status: 'confirmed'
                        }
                    }));
                    this.transactions.push({
                        step: 'USDC Reward Transfer',
                        txHash: txHash,
                        explorer: `https://basescan.org/tx/${txHash}`
                    });
                }, 1000);
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
        console.log('🚀 Starting IoT Device Proximity Workflow Test (Browser Simulated)\n');
        
        // Execute workflow via HTTP API
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'Register IoT device TESTDEVICE001 with proximity proof'
            })
        });
        
        console.log(`📡 Workflow request sent (HTTP ${response.status})\n`);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 90000));
    }
}

async function main() {
    const tester = new BrowserSimulatedTester();
    
    try {
        await tester.connect();
        await tester.testIoTWorkflow();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main();