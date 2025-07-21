// Complete flow test for AI prediction proof
console.log('=== Complete AI Prediction Proof Flow Test ===\n');

// Step 1: Clear any existing handlers to avoid conflicts
console.log('1. Testing proof generation flow...');

// Create a unique proof ID
const testProofId = 'proof_ai_content_test_' + Date.now();

// Step 2: Simulate proof_status message
console.log('\n2. Sending proof_status (generating)...');
window.wsManager.handleMessage({
    type: 'proof_status',
    status: 'generating',
    proof_id: testProofId,
    metadata: {
        function: 'prove_ai_content'
    },
    message: 'Generating AI prediction commitment proof...',
    workflowId: 'wf_test_' + Date.now()
});

// Step 3: Check if card was created
setTimeout(() => {
    const card = document.querySelector(`[data-proof-id="${testProofId}"]`);
    console.log('\n3. Card created:', !!card);
    if (card) {
        console.log('   - Function name attr:', card.getAttribute('data-function-name'));
        console.log('   - Has generating box:', !!card.querySelector('.proof-generating-box'));
        console.log('   - Status:', card.querySelector('.status-badge')?.textContent);
    }
    
    // Step 4: Send proof_complete message
    console.log('\n4. Sending proof_complete...');
    window.wsManager.handleMessage({
        type: 'proof_complete',
        proof_id: testProofId,
        status: 'complete',
        metrics: {
            generation_time_secs: 3.5,
            proof_size: 2048
        },
        metadata: {
            function: 'prove_ai_content'
        },
        workflowId: 'wf_test_' + Date.now() // Different workflow ID to ensure it's not in workflowStates
    });
    
    // Step 5: Check final state
    setTimeout(() => {
        console.log('\n5. Final card state:');
        const finalCard = document.querySelector(`[data-proof-id="${testProofId}"]`);
        if (finalCard) {
            console.log('   - Status:', finalCard.querySelector('.status-badge')?.textContent);
            console.log('   - Has metrics:', !!finalCard.querySelector('.proof-metrics'));
            console.log('   - Has commitment info:', !!finalCard.querySelector('.commitment-info'));
            const baseLink = finalCard.querySelector('.commitment-info a');
            if (baseLink) {
                console.log('   - Base link href:', baseLink.getAttribute('href'));
            } else {
                console.log('   - No Base link found');
                // Check content
                const content = finalCard.querySelector('.card-content');
                if (content) {
                    console.log('   - Content HTML preview:', content.innerHTML.substring(0, 200) + '...');
                }
            }
        } else {
            console.log('   - Card not found!');
        }
        
        // Test the hash generation
        console.log('\n6. Testing hash generation:');
        const testHash = window.proofManager.generateCommitmentTxHash(testProofId);
        console.log('   - Generated hash:', testHash);
        console.log('   - Hash is valid format:', /^0x[a-f0-9]{64}$/i.test(testHash));
        
    }, 500);
}, 500);