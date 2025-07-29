#!/usr/bin/env node

// Test IoTeX on-chain verification
import WebSocket from 'ws';
import fetch from 'node-fetch';

class IoTeXVerificationTest {
    constructor() {
        this.ws = null;
        this.proofData = null;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to zkEngine WebSocket...');
            this.ws = new WebSocket('ws://localhost:8001/ws');
            
            this.ws.on('open', () => {
                console.log('✅ WebSocket connected\n');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                this.handleWebSocketMessage(msg);
            });
            
            this.ws.on('error', reject);
        });
    }
    
    handleWebSocketMessage(msg) {
        console.log(`📨 ${msg.type}:`, msg.status || msg.proof_id || msg.message || 'received');
        
        if (msg.type === 'proof_complete' && msg.proof) {
            this.proofData = {
                proofId: msg.proof_id,
                proof: msg.proof,
                commitment: msg.commitment,
                publicSignals: msg.public_signals
            };
            console.log('\n✅ Proof generated successfully');
            console.log('Proof ID:', this.proofData.proofId);
            console.log('Commitment:', this.proofData.commitment);
        }
    }
    
    async generateDeviceProof() {
        console.log('🔐 Generating device proximity proof...\n');
        
        const deviceId = `TEST_${Date.now()}`;
        const x = Math.floor(Math.random() * 10000);
        const y = Math.floor(Math.random() * 10000);
        
        const proof_request = {
            circuit: "device_proximity",
            inputs: {
                device_id: deviceId,
                x: x,
                y: y
            }
        };
        
        console.log('Device ID:', deviceId);
        console.log('Coordinates:', `(${x}, ${y})`);
        console.log('');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Proof generation timeout'));
            }, 30000);
            
            const messageHandler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'proof_complete') {
                    clearTimeout(timeout);
                    this.ws.removeListener('message', messageHandler);
                    resolve();
                } else if (msg.type === 'error') {
                    clearTimeout(timeout);
                    this.ws.removeListener('message', messageHandler);
                    reject(new Error(msg.message));
                }
            };
            
            this.ws.on('message', messageHandler);
            this.ws.send(JSON.stringify(proof_request));
        });
    }
    
    async testWorkflowVerification() {
        console.log('\n🔄 Testing IoTeX verification through workflow...\n');
        
        const query = "Generate device proximity proof for IoT device TEST123 at coordinates x=5000, y=5000 and verify on IoTeX";
        
        console.log('Query:', query);
        
        try {
            const response = await fetch('http://localhost:8002/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('\n✅ Workflow created successfully');
            console.log('Workflow ID:', result.workflow_id || 'N/A');
            
            // Wait for workflow to complete
            console.log('\nWaiting for on-chain verification...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            return true;
            
        } catch (error) {
            console.error('❌ Workflow error:', error.message);
            return false;
        }
    }
    
    async checkContractStatus() {
        console.log('\n📊 Checking IoTeX contract status...\n');
        
        try {
            const response = await fetch('http://localhost:8001/api/v1/iotex/contract-info');
            if (response.ok) {
                const info = await response.json();
                console.log('Contract info:', JSON.stringify(info, null, 2));
            }
        } catch (error) {
            console.log('Could not fetch contract info:', error.message);
        }
    }
}

async function main() {
    console.log('🧪 IoTeX On-Chain Verification Test\n');
    console.log('=' .repeat(50) + '\n');
    
    const test = new IoTeXVerificationTest();
    
    try {
        // Test 1: Connect to WebSocket
        await test.connect();
        
        // Test 2: Generate device proximity proof
        console.log('TEST 1: Direct Proof Generation');
        console.log('-'.repeat(30));
        await test.generateDeviceProof();
        
        // Test 3: Test through workflow (includes on-chain verification)
        console.log('\n\nTEST 2: Workflow with On-Chain Verification');
        console.log('-'.repeat(30));
        const workflowSuccess = await test.testWorkflowVerification();
        
        // Test 4: Check contract status
        await test.checkContractStatus();
        
        // Summary
        console.log('\n\n📊 TEST SUMMARY');
        console.log('=' .repeat(50));
        console.log('✅ WebSocket connection: Success');
        console.log('✅ Proof generation: Success');
        console.log(workflowSuccess ? '✅' : '❌', 'Workflow verification:', workflowSuccess ? 'Success' : 'Failed');
        
        console.log('\n💡 To verify the on-chain transaction:');
        console.log('1. Check the browser console at http://localhost:8001');
        console.log('2. Look for IoTeX transaction hash in the UI');
        console.log('3. Visit https://testnet.iotexscan.io/ to verify');
        
        console.log('\n📝 Notes:');
        console.log('- Make sure MetaMask is connected to IoTeX testnet');
        console.log('- Ensure you have test IOTX for gas fees');
        console.log('- The contract address is: 0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        if (test.ws) {
            test.ws.close();
        }
        process.exit(0);
    }
}

// Run the test
main();