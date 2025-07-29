import WebSocket from 'ws';
import fetch from 'node-fetch';

// Simulate browser environment with all necessary components
global.window = {
    proofManager: {
        proofs: new Map()
    },
    iotexDeviceVerifier: {
        verifyDeviceProximity: async (deviceId, x, y, proofData) => {
            console.log(`\n🔐 Verifying device ${deviceId} at coordinates (${x}, ${y})`);
            const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
            console.log(`📋 Verification transaction: ${txHash}`);
            return {
                success: true,
                txHash: txHash,
                blockNumber: Math.floor(Math.random() * 1000000)
            };
        }
    }
};

class IoTWorkflowTester {
    constructor() {
        this.ws = null;
        this.transactions = [];
        this.workflowSteps = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket server');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });
            
            this.ws.on('error', reject);
        });
    }

    handleMessage(message) {
        const timestamp = new Date().toISOString();
        
        switch(message.type) {
            case 'workflow_started':
                console.log(`\n📊 Workflow Started - ID: ${message.workflowId}`);
                console.log('Steps:');
                message.steps.forEach((step, i) => {
                    console.log(`  ${i+1}. ${step.action} (${step.status})`);
                    this.workflowSteps.push(step);
                });
                break;
                
            case 'workflow_step_update':
                const update = message.updates;
                console.log(`\n✅ Step Update - ${message.stepId}: ${update.status}`);
                
                // Capture transaction from step update
                if (update.txHash) {
                    const stepInfo = this.workflowSteps[parseInt(message.stepId.split('_')[1]) - 1];
                    this.transactions.push({
                        step: stepInfo ? stepInfo.action : message.stepId,
                        txHash: update.txHash,
                        network: this.getNetworkForStep(stepInfo?.action),
                        explorer: this.getExplorerUrl(update.txHash, stepInfo?.action)
                    });
                }
                break;
                
            case 'device_registration_request':
                console.log(`\n📱 Device Registration Request`);
                console.log(`  Device ID: ${message.deviceId}`);
                
                setTimeout(async () => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    console.log(`  Transaction: ${txHash}`);
                    
                    this.ws.send(JSON.stringify({
                        type: 'device_registration_response',
                        requestId: message.requestId,
                        success: true,
                        ioId: `ioID_${message.deviceId}_${Date.now()}`,
                        did: `did:io:${message.deviceId}`,
                        txHash: txHash
                    }));
                    
                    this.transactions.push({
                        step: 'Device Registration (ioID)',
                        txHash: txHash,
                        network: 'IoTeX Testnet',
                        explorer: `https://testnet.iotexscan.io/tx/${txHash}`
                    });
                }, 500);
                break;
                
            case 'proof_complete':
                console.log(`\n🔐 Zero-Knowledge Proof Generated`);
                console.log(`  Proof ID: ${message.proof_id}`);
                console.log(`  Generation time: ${message.metrics?.generation_time_secs?.toFixed(2)}s`);
                console.log(`  Proof size: ${(message.metrics?.proof_size / 1024 / 1024).toFixed(2)} MB`);
                
                // Store proof data
                if (global.window.proofManager && message.proof_id) {
                    global.window.proofManager.proofs.set(message.proof_id, message);
                }
                break;
                
            case 'iotex_verification_request':
                console.log(`\n✅ IoTeX Blockchain Verification Request`);
                console.log(`  Proof ID: ${message.proofId}`);
                
                setTimeout(async () => {
                    try {
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
                            message.deviceId || 'TESTDEVICE001',
                            x,
                            y,
                            proofData
                        );
                        
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
                            network: 'IoTeX Testnet',
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
                
            case 'claim_rewards_request':
                console.log(`\n💎 IOTX Reward Claim Request`);
                console.log(`  Device ID: ${message.deviceId}`);
                
                setTimeout(() => {
                    const txHash = '0x' + Math.random().toString(16).substr(2, 64).padEnd(64, '0');
                    console.log(`  Transaction: ${txHash}`);
                    console.log(`  Amount: 0.01 IOTX`);
                    
                    this.ws.send(JSON.stringify({
                        type: 'claim_rewards_response',
                        requestId: message.requestId,
                        success: true,
                        txHash: txHash,
                        amount: '0.01',
                        currency: 'IOTX'
                    }));
                    
                    this.transactions.push({
                        step: 'IOTX Reward Claim',
                        txHash: txHash,
                        network: 'IoTeX Testnet',
                        explorer: `https://testnet.iotexscan.io/tx/${txHash}`
                    });
                }, 500); // Reduced timeout
                break;
                
            case 'workflow_completed':
                console.log(`\n${'='.repeat(70)}`);
                console.log(`📊 WORKFLOW COMPLETED: ${message.success ? '✅ SUCCESS' : '❌ FAILED'}`);
                if (!message.success) {
                    console.log(`Error: ${message.error}`);
                }
                console.log('='.repeat(70));
                
                this.printTransactionSummary();
                setTimeout(() => process.exit(0), 2000);
                break;
        }
    }
    
    getNetworkForStep(action) {
        if (!action) return 'Unknown';
        if (action.includes('register') || action.includes('iotex') || action.includes('claim')) return 'IoTeX Testnet';
        return 'Unknown';
    }
    
    getExplorerUrl(txHash, action) {
        // All IoT demo transactions are on IoTeX
        return `https://testnet.iotexscan.io/tx/${txHash}`;
    }
    
    printTransactionSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('🔗 BLOCKCHAIN TRANSACTIONS SUMMARY');
        console.log('='.repeat(70));
        
        if (this.transactions.length === 0) {
            console.log('No blockchain transactions recorded');
        } else {
            console.log(`\nTotal Transactions: ${this.transactions.length}`);
            console.log('\nTransaction Details:');
            
            this.transactions.forEach((tx, index) => {
                console.log(`\n${index + 1}. ${tx.step}`);
                console.log(`   Network: ${tx.network}`);
                console.log(`   Transaction Hash: ${tx.txHash}`);
                console.log(`   Explorer Link: ${tx.explorer}`);
            });
            
            // Group by network
            console.log('\n' + '-'.repeat(70));
            console.log('Transactions by Network:');
            
            const byNetwork = {};
            this.transactions.forEach(tx => {
                if (!byNetwork[tx.network]) byNetwork[tx.network] = [];
                byNetwork[tx.network].push(tx);
            });
            
            Object.entries(byNetwork).forEach(([network, txs]) => {
                console.log(`\n${network}: ${txs.length} transaction(s)`);
                txs.forEach(tx => {
                    console.log(`  - ${tx.step}`);
                });
            });
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('\n✨ IoT Device Proximity Workflow Test Complete');
        console.log('='.repeat(70));
    }
    
    async testIoTWorkflow() {
        console.log('🚀 Starting IoT Device Proximity Workflow Test');
        console.log('='.repeat(70));
        
        // Execute workflow via HTTP API
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'Register IoT device TESTDEVICE001 with proximity proof'
            })
        });
        
        console.log(`\n📡 Workflow request sent (HTTP ${response.status})`);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 90000));
    }
}

async function main() {
    const tester = new IoTWorkflowTester();
    
    try {
        await tester.connect();
        await tester.testIoTWorkflow();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main();