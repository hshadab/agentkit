// Test script to verify proof card behavior
// This simulates the proof generation flow to check for duplicate cards

console.log('Testing proof card generation...');

// Simulate proof_status message (generating)
const proofId = 'proof_ai_content_' + Date.now();
console.log(`\n1. Sending proof_status (generating) for ${proofId}`);

window.wsManager.handleMessage({
    type: 'proof_status',
    status: 'generating',
    proof_id: proofId,
    metadata: {
        function: 'prove_ai_content'
    },
    message: 'Generating AI prediction commitment proof...'
});

// Wait 2 seconds, then send completion
setTimeout(() => {
    console.log(`\n2. Sending proof_complete for ${proofId}`);
    
    window.wsManager.handleMessage({
        type: 'proof_complete',
        proof_id: proofId,
        status: 'complete',
        metrics: {
            generation_time_secs: 1.5,
            proof_size: 2048
        },
        metadata: {
            function: 'prove_ai_content'
        }
    });
    
    // Check how many proof cards exist with this ID
    setTimeout(() => {
        const cards = document.querySelectorAll(`[data-proof-id="${proofId}"]`);
        console.log(`\n3. Found ${cards.length} proof card(s) with ID ${proofId}`);
        
        if (cards.length === 1) {
            console.log('✅ SUCCESS: Only one proof card exists (no duplicates)');
            
            // Check if the Base link is properly formatted
            const baseLink = cards[0].querySelector('.commitment-info a');
            if (baseLink) {
                const href = baseLink.getAttribute('href');
                console.log(`\n4. Base commitment link: ${href}`);
                
                if (href.startsWith('https://sepolia.basescan.org/tx/0x') && href.length > 50) {
                    console.log('✅ SUCCESS: Base link is properly formatted');
                } else {
                    console.log('❌ FAIL: Base link is malformed');
                }
            } else {
                console.log('❌ FAIL: No Base commitment link found');
            }
        } else if (cards.length === 0) {
            console.log('❌ FAIL: No proof card found');
        } else {
            console.log('❌ FAIL: Multiple proof cards found (duplicates exist)');
        }
    }, 500);
}, 2000);