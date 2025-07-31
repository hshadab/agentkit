// Wrapper function for Avalanche verification that prevents page refresh
window.safeVerifyOnAvalanche = async function(proofId, proofType, evt) {
    console.log('[AVALANCHE_VERIFY] Starting safe verification for:', proofId, proofType);
    console.log('[AVALANCHE_VERIFY] ProofId details:', {
        value: proofId,
        type: typeof proofId,
        length: proofId ? proofId.length : 0,
        stringified: JSON.stringify(proofId)
    });
    
    // CRITICAL: Prevent page refresh with all possible methods
    const e = evt || window.event || event;
    if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.returnValue = false;
    }
    
    // Extra safety: use setTimeout to break out of event context
    setTimeout(async () => {
        try {
            // Wait for blockchainVerifier to be available (with timeout)
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            while (!window.blockchainVerifier && attempts < maxAttempts) {
                console.log('[AVALANCHE_VERIFY] Waiting for blockchainVerifier...', attempts);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            // Check if blockchainVerifier exists
            if (!window.blockchainVerifier) {
                console.error('[AVALANCHE_VERIFY] blockchainVerifier not found after waiting!');
                
                // Try to call the direct function if available
                if (typeof window.verifyOnAvalancheActual === 'function') {
                    console.log('[AVALANCHE_VERIFY] Falling back to direct function call');
                    const result = await window.verifyOnAvalancheActual(proofId, proofType);
                    
                    // Show result to user if possible
                    if (result.success) {
                        alert(`Avalanche verification successful! TX: ${result.txHash}`);
                    } else {
                        alert(`Avalanche verification failed: ${result.error}`);
                    }
                    
                    return false;
                }
                
                alert('Blockchain verifier not loaded. Please refresh the page and try again.');
                return false;
            }
            
            // Call the verification function
            const result = await window.blockchainVerifier.verifyOnAvalanche(proofId, proofType);
            console.log('[AVALANCHE_VERIFY] Verification result:', result);
            
            return false; // Always return false to prevent any form submission
            
        } catch (error) {
            console.error('[AVALANCHE_VERIFY] Error during verification:', error);
            console.error('[AVALANCHE_VERIFY] Error stack:', error.stack);
            
            // Show error to user
            if (window.blockchainVerifier && window.blockchainVerifier.uiManager) {
                window.blockchainVerifier.uiManager.showToast(
                    'Avalanche verification failed: ' + error.message, 
                    'error'
                );
            } else {
                // Fallback alert if UI manager not available
                alert('Avalanche verification failed: ' + error.message);
            }
            
            return false; // Always return false to prevent any form submission
        }
    }, 0); // End of setTimeout
    
    // Always return false immediately to prevent form submission
    return false;
};

console.log('[AVALANCHE_VERIFY] Safe wrapper loaded');