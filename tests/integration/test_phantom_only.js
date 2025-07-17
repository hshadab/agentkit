#!/usr/bin/env node

const WebSocket = require('ws');

async function testPhantomWorkflow() {
    console.log('=== Testing Phantom-Only Setup ===\n');
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket server');
            
            // Test 1: Generate a simple KYC proof
            const testRequest = {
                message: 'Generate KYC proof',
                proof_id: `proof_kyc_test_${Date.now()}`,
                metadata: {
                    function: 'prove_kyc',
                    arguments: ['12345', '1'],
                    step_size: 50,
                    explanation: 'Testing KYC proof with Phantom-only setup',
                    additional_context: {
                        test: true,
                        wallet: 'phantom-only'
                    }
                }
            };
            
            console.log('📤 Sending proof generation request...');
            ws.send(JSON.stringify(testRequest));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            
            switch(message.type) {
                case 'proof_status':
                    console.log(`⏳ Status: ${message.message}`);
                    break;
                    
                case 'proof_complete':
                    console.log(`✅ Proof generated successfully!`);
                    console.log(`   Proof ID: ${message.proof_id}`);
                    if (message.timestamp) {
                        console.log(`   Timestamp: ${new Date(message.timestamp).toISOString()}`);
                    }
                    
                    // Test 2: Send a workflow command through the unified system
                    console.log('\n📤 Testing unified workflow system...');
                    ws.send(JSON.stringify({
                        message: 'Generate location proof and verify it',
                        metadata: {
                            source: 'test',
                            isUnifiedWorkflow: true
                        }
                    }));
                    break;
                    
                case 'workflow_started':
                    console.log(`\n🔄 Workflow started: ${message.workflowId}`);
                    console.log(`   Steps: ${message.totalSteps}`);
                    break;
                    
                case 'workflow_step_complete':
                    console.log(`   ✓ Step ${message.stepIndex + 1} complete: ${message.description}`);
                    break;
                    
                case 'workflow_complete':
                    console.log(`\n✅ Workflow completed successfully!`);
                    console.log('\n=== Test Summary ===');
                    console.log('1. Direct proof generation: ✅ Working');
                    console.log('2. Unified workflow system: ✅ Working');
                    console.log('3. WebSocket communication: ✅ Working');
                    console.log('\nNow test in the browser with Phantom:');
                    console.log('1. Open http://localhost:8001');
                    console.log('2. Try: "Generate KYC proof"');
                    console.log('3. Click "Verify on Solana" (recommended for Phantom)');
                    console.log('4. If you try "Verify on Ethereum", you should see the Phantom warning');
                    
                    ws.close();
                    resolve(true);
                    break;
                    
                case 'error':
                case 'proof_error':
                case 'workflow_error':
                    console.error(`❌ Error: ${message.error || message.message}`);
                    ws.close();
                    reject(new Error(message.error || message.message));
                    break;
                    
                default:
                    if (message.type) {
                        console.log(`   [${message.type}] ${JSON.stringify(message).substring(0, 100)}...`);
                    }
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });
        
        ws.on('close', () => {
            console.log('\n🔌 WebSocket connection closed');
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            console.error('\n❌ Test timed out after 30 seconds');
            ws.close();
            reject(new Error('Test timeout'));
        }, 30000);
    });
}

// Run the test
console.log('Starting Phantom-only test...\n');

testPhantomWorkflow()
    .then(() => {
        console.log('\n✅ All backend tests passed!');
        console.log('\nNext steps:');
        console.log('1. Open http://localhost:8001 in your browser');
        console.log('2. Make sure Phantom is connected');
        console.log('3. Test proof generation and Solana verification');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });