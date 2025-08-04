// Test medical proof display in browser console
// Run at http://localhost:8001

async function testMedicalProofDisplay() {
    console.log('🏥 Testing Medical Proof Display...');
    
    // Simulate a medical integrity proof with commitment data
    const proofId = `proof_medical_integrity_${Date.now()}`;
    
    // First, simulate the proof generation
    window.wsManager.handleMessage({
        type: 'proof_status',
        status: 'generating',
        proof_id: proofId,
        metadata: {
            function: 'prove_medical_integrity'
        },
        message: 'Generating medical integrity proof...'
    });
    
    // Wait a bit then complete the proof with medical record data
    setTimeout(() => {
        window.wsManager.handleMessage({
            type: 'proof_complete',
            proof_id: proofId,
            status: 'complete',
            metrics: {
                generation_time_secs: 16.5,
                proof_size: 13286348
            },
            metadata: {
                function: 'prove_medical_integrity',
                additional_context: {
                    medicalRecordData: {
                        patient_id: '12345',
                        record_hash: '0xabc123def456789',
                        creation_timestamp: String(Math.floor(Date.now() / 1000) - 86400),
                        commitment_timestamp: String(Math.floor(Date.now() / 1000) - 86400),
                        transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
                        blockNumber: 12345678,
                        status: 'committed'
                    }
                }
            },
            public_inputs: ['12345', '123456789', String(Math.floor(Date.now() / 1000) - 86400), String(Math.floor(Date.now() / 1000))]
        });
        
        // Check the proof card
        setTimeout(() => {
            const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
            if (proofCard) {
                console.log('✅ Proof card found');
                const commitmentInfo = proofCard.querySelector('.commitment-info');
                if (commitmentInfo) {
                    console.log('✅ Commitment info displayed:', commitmentInfo.innerHTML);
                } else {
                    console.log('❌ No commitment info found');
                }
            } else {
                console.log('❌ Proof card not found');
            }
        }, 100);
    }, 2000);
}

// Also test with simulated data
async function testMedicalProofSimulated() {
    console.log('\n🏥 Testing Medical Proof Display (Simulated)...');
    
    const proofId = `proof_medical_simulated_${Date.now()}`;
    
    // Generate proof with simulated medical data
    window.wsManager.handleMessage({
        type: 'proof_status',
        status: 'generating',
        proof_id: proofId,
        metadata: {
            function: 'prove_medical_integrity'
        }
    });
    
    setTimeout(() => {
        window.wsManager.handleMessage({
            type: 'proof_complete',
            proof_id: proofId,
            status: 'complete',
            metrics: {
                generation_time_secs: 16.5,
                proof_size: 13286348
            },
            metadata: {
                function: 'prove_medical_integrity',
                additional_context: {
                    medicalRecordData: {
                        patient_id: '12345',
                        record_hash: '0xdef456789abc123',
                        creation_timestamp: String(Math.floor(Date.now() / 1000) - 86400),
                        commitment_timestamp: String(Math.floor(Date.now() / 1000) - 86400),
                        status: 'simulated'
                    }
                }
            }
        });
    }, 2000);
}

window.testMedicalProofDisplay = testMedicalProofDisplay;
window.testMedicalProofSimulated = testMedicalProofSimulated;

console.log(`
=== Medical Proof Display Test ===
Run: testMedicalProofDisplay()     - Test with blockchain link
Run: testMedicalProofSimulated()   - Test with simulated mode

This will create proof cards and check if the Avalanche link appears.
`);