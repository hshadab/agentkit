// Diagnostic script for proof card issues
console.log('=== Diagnosing Proof Card Issues ===\n');

// Function to check proof card state
function checkProofCard(proofId) {
    const card = document.querySelector(`[data-proof-id="${proofId}"]`);
    if (!card) {
        console.log('❌ No proof card found with ID:', proofId);
        return;
    }
    
    console.log('✓ Proof card found');
    console.log('  - Function name attribute:', card.getAttribute('data-function-name'));
    console.log('  - Status badge text:', card.querySelector('.status-badge')?.textContent);
    
    const content = card.querySelector('.card-content');
    console.log('  - Has content div:', !!content);
    
    if (content) {
        console.log('  - Content HTML length:', content.innerHTML.length);
        console.log('  - Has proof metrics:', !!content.querySelector('.proof-metrics'));
        console.log('  - Has commitment info:', !!content.querySelector('.commitment-info'));
        console.log('  - Has generating box:', !!content.querySelector('.proof-generating-box'));
        
        const commitmentLink = content.querySelector('.commitment-info a');
        if (commitmentLink) {
            console.log('  - Base link href:', commitmentLink.getAttribute('href'));
        }
    }
    
    console.log('  - Has actions:', !!card.querySelector('.card-actions'));
    console.log('  - Has verification results:', !!card.querySelector('.verification-results'));
}

// Check all current proof cards
console.log('Current proof cards on page:');
const allCards = document.querySelectorAll('.proof-card');
allCards.forEach((card, index) => {
    const proofId = card.getAttribute('data-proof-id');
    console.log(`\n${index + 1}. Checking card: ${proofId}`);
    checkProofCard(proofId);
});

// Function to manually trigger update
window.manualUpdateTest = function(proofId) {
    console.log('\n=== Manual Update Test ===');
    const testData = {
        proofId: proofId,
        status: 'complete',
        metrics: {
            generation_time_secs: 5.5,
            proof_size: 2048
        },
        metadata: {
            function: 'prove_ai_content'
        },
        proof_function: 'prove_ai_content'
    };
    
    console.log('Calling updateProofCard with test data...');
    window.proofManager.updateProofCard(proofId, 'complete', testData);
    
    // Check state after update
    setTimeout(() => {
        console.log('\nChecking card state after update:');
        checkProofCard(proofId);
    }, 100);
};

console.log('\n\nTo manually test an update, run: manualUpdateTest("proof_id_here")');