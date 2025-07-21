// Comprehensive test for all fixes
console.log('=== Testing All Proof Card Fixes ===\n');

// Test 1: AI Prediction Proof with Base Link
console.log('1. Testing AI Prediction Proof Generation...');
const aiProofId = 'proof_ai_content_' + Date.now();

// Simulate proof generation
window.wsManager.handleMessage({
    type: 'proof_status',
    status: 'generating',
    proof_id: aiProofId,
    metadata: {
        function: 'prove_ai_content'
    },
    message: 'Generating AI prediction commitment proof...'
});

// Complete the proof
setTimeout(() => {
    window.wsManager.handleMessage({
        type: 'proof_complete',
        proof_id: aiProofId,
        status: 'complete',
        metrics: {
            generation_time_secs: 1.5,
            proof_size: 2048
        }
    });
    
    // Check results
    setTimeout(() => {
        const aiCard = document.querySelector(`[data-proof-id="${aiProofId}"]`);
        console.log('✓ AI Proof Card found:', !!aiCard);
        console.log('✓ Card count:', document.querySelectorAll(`[data-proof-id="${aiProofId}"]`).length);
        
        const baseLink = aiCard?.querySelector('.commitment-info a');
        console.log('✓ Base link present:', !!baseLink);
        if (baseLink) {
            console.log('✓ Base link href:', baseLink.getAttribute('href'));
        }
        
        // Test 2: Local Verification
        console.log('\n2. Testing Local Verification (should update card, not create new one)...');
        window.wsManager.handleMessage({
            type: 'verification_complete',
            proof_id: aiProofId,
            result: 'VALID',
            status: 'verified'
        });
        
        setTimeout(() => {
            // Check if verification was added to the card
            const verificationResults = document.querySelector(`#verification-results-${aiProofId}`);
            const verificationItems = verificationResults?.querySelectorAll('.verification-result-item');
            console.log('✓ Verification results container found:', !!verificationResults);
            console.log('✓ Verification items in card:', verificationItems?.length || 0);
            
            // Check we didn't create a separate verification card
            const separateVerificationCards = document.querySelectorAll('.verification-card');
            console.log('✓ Separate verification cards:', separateVerificationCards.length);
            
            // Test 3: KYC Proof
            console.log('\n3. Testing KYC Proof (regular proof)...');
            const kycProofId = 'proof_kyc_' + Date.now();
            
            window.wsManager.handleMessage({
                type: 'proof_status',
                status: 'generating',
                proof_id: kycProofId,
                metadata: {
                    function: 'prove_kyc'
                }
            });
            
            setTimeout(() => {
                window.wsManager.handleMessage({
                    type: 'proof_complete',
                    proof_id: kycProofId,
                    status: 'complete',
                    metrics: {
                        generation_time_secs: 2.1,
                        proof_size: 1536
                    }
                });
                
                const kycCard = document.querySelector(`[data-proof-id="${kycProofId}"]`);
                console.log('✓ KYC Proof Card found:', !!kycCard);
                console.log('✓ KYC Card has Base link:', !!kycCard?.querySelector('.commitment-info'));
                
                console.log('\n=== Test Complete ===');
                console.log('Summary:');
                console.log('- AI Prediction proofs should show Base commitment link');
                console.log('- Verification should add to existing card, not create new one');
                console.log('- Regular proofs should NOT show Base link');
            }, 500);
        }, 500);
    }, 500);
}, 2000);