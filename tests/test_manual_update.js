// Manual test to update AI prediction proof card
console.log('=== Manual AI Prediction Proof Update Test ===\n');

// Find the most recent AI prediction proof card
const allCards = document.querySelectorAll('.proof-card');
let aiProofCard = null;
let aiProofId = null;

allCards.forEach(card => {
    const funcName = card.getAttribute('data-function-name');
    if (funcName === 'prove_ai_content') {
        aiProofCard = card;
        aiProofId = card.getAttribute('data-proof-id');
    }
});

if (!aiProofId) {
    console.log('No AI prediction proof card found. Generate one first.');
} else {
    console.log('Found AI prediction proof card:', aiProofId);
    console.log('Current status:', aiProofCard.querySelector('.status-badge')?.textContent);
    console.log('Has generating box:', !!aiProofCard.querySelector('.proof-generating-box'));
    console.log('Has metrics:', !!aiProofCard.querySelector('.proof-metrics'));
    
    // Manually call updateProofCard
    console.log('\nManually updating proof card...');
    window.proofManager.updateProofCard(aiProofId, 'complete', {
        proofId: aiProofId,
        status: 'complete',
        metrics: {
            generation_time_secs: 14.6,
            proof_size: 19038604
        },
        metadata: {
            function: 'prove_ai_content'
        },
        proof_function: 'prove_ai_content'
    });
    
    // Check result after a brief delay
    setTimeout(() => {
        console.log('\nAfter update:');
        console.log('Status badge:', aiProofCard.querySelector('.status-badge')?.textContent);
        console.log('Has metrics:', !!aiProofCard.querySelector('.proof-metrics'));
        console.log('Has commitment info:', !!aiProofCard.querySelector('.commitment-info'));
        
        const baseLink = aiProofCard.querySelector('.commitment-info a');
        if (baseLink) {
            console.log('Base link found:', baseLink.getAttribute('href'));
        } else {
            console.log('No Base link found!');
        }
    }, 100);
}