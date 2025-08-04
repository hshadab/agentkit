// Direct test for medical workflow with proper message handling
import WebSocket from 'ws';
import { ethers } from 'ethers';

async function testMedicalWorkflow() {
    console.log('🏥 Testing medical workflow with handler...');
    
    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Send workflow command
        const message = {
            content: 'Create medical record for patient 77777 and verify integrity',
            type: 'chat'
        };
        
        console.log('📤 Sending workflow command...');
        ws.send(JSON.stringify(message));
    });
    
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`📨 Message type: ${msg.type}`);
            
            // Handle create_medical_record_with_commitment
            if (msg.type === 'create_medical_record_with_commitment') {
                console.log('   📋 Handling medical record creation with commitment...');
                console.log('   Patient ID:', msg.patientId);
                console.log('   Record Hash:', msg.recordHash);
                console.log('   Request ID:', msg.requestId);
                
                // Simulate successful medical record creation
                const response = {
                    type: 'medical_record_complete',
                    requestId: msg.requestId,
                    recordData: {
                        success: true,
                        recordId: `record_${Date.now()}`,
                        patientId: msg.patientId,
                        recordHash: msg.recordHash,
                        creation_timestamp: String(Math.floor(Date.now() / 1000) - 86400),
                        transactionHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                        explorerUrl: 'https://testnet.snowtrace.io/tx/0x...'
                    }
                };
                
                console.log('   📤 Sending response:', response);
                ws.send(JSON.stringify(response));
            }
            
            // Log important messages
            else if (msg.type === 'workflow_step_update') {
                console.log(`   Step ${msg.stepId}: ${msg.updates?.status} - ${msg.updates?.result || ''}`);
            } else if (msg.type === 'verify_on_avalanche') {
                console.log('   🔐 Verify on Avalanche request received');
                console.log('   Proof Type:', msg.proofType);
                console.log('   Request ID:', msg.requestId);
                
                // Send verification response matching the expected format
                const verifyResponse = {
                    type: 'verification_result',
                    requestId: msg.requestId,
                    success: true,
                    transaction_hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                    explorer_url: 'https://testnet.snowtrace.io/tx/0x...'
                };
                
                console.log('   📤 Sending verification response');
                ws.send(JSON.stringify(verifyResponse));
            } else if (msg.type === 'blockchain_verification_request') {
                console.log('   🔐 Blockchain verification request received');
                console.log('   Proof ID:', msg.proofId);
                console.log('   Proof Type:', msg.proofType);
                console.log('   Blockchain:', msg.blockchain);
                
                // Send blockchain verification response
                const verifyResponse = {
                    type: 'blockchain_verification_response',
                    proof_id: msg.proofId,
                    blockchain: msg.blockchain,
                    success: true,
                    transaction_hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                    explorer_url: 'https://testnet.snowtrace.io/tx/0x...'
                };
                
                console.log('   📤 Sending blockchain verification response');
                ws.send(JSON.stringify(verifyResponse));
            } else if (msg.type === 'proof_complete') {
                console.log('   ✅ Proof generated:', msg.proofId);
            } else if (msg.type === 'workflow_completed') {
                console.log('   📋 Workflow completed:', JSON.stringify(msg, null, 2));
                
                // Close connection after completion
                setTimeout(() => {
                    ws.close();
                    process.exit(msg.success ? 0 : 1);
                }, 1000);
            } else if (msg.error) {
                console.error('   ❌ Error:', msg.error);
                ws.close();
                process.exit(1);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
        console.error('❌ Test timed out after 2 minutes');
        ws.close();
        process.exit(1);
    }, 120000);
}

// Run the test
testMedicalWorkflow().catch(console.error);