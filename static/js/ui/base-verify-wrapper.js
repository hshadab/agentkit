// Wrapper function for Base verification that prevents page refresh
window.safeVerifyOnBase = async function(proofId, proofType) {
    console.log('[BASE_VERIFY] Starting safe verification for:', proofId, proofType);
    
    try {
        // Prevent any default behaviors
        if (window.event) {
            window.event.preventDefault();
            window.event.stopPropagation();
        }
        
        // Wait for blockchainVerifier to be available (with timeout)
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.blockchainVerifier && attempts < maxAttempts) {
            console.log('[BASE_VERIFY] Waiting for blockchainVerifier...', attempts);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Check if blockchainVerifier exists
        if (!window.blockchainVerifier) {
            console.error('[BASE_VERIFY] blockchainVerifier not found after waiting!');
            
            // Try to call the direct function if available
            if (typeof window.verifyOnBaseActual === 'function') {
                console.log('[BASE_VERIFY] Falling back to direct function call');
                const result = await window.verifyOnBaseActual(proofId, proofType);
                
                // Show result to user if possible
                if (result.success) {
                    alert(`Base verification successful! TX: ${result.txHash}`);
                } else {
                    alert(`Base verification failed: ${result.error}`);
                }
                
                return false;
            }
            
            alert('Blockchain verifier not loaded. Please refresh the page and try again.');
            return false;
        }
        
        // Call the verification function
        const result = await window.blockchainVerifier.verifyOnBase(proofId, proofType);
        console.log('[BASE_VERIFY] Verification result:', result);
        
        return false; // Always return false to prevent any form submission
        
    } catch (error) {
        console.error('[BASE_VERIFY] Error during verification:', error);
        console.error('[BASE_VERIFY] Error stack:', error.stack);
        
        // Show error to user
        if (window.blockchainVerifier && window.blockchainVerifier.uiManager) {
            window.blockchainVerifier.uiManager.showToast(
                'Base verification failed: ' + error.message, 
                'error'
            );
        } else {
            // Fallback alert if UI manager not available
            alert('Base verification failed: ' + error.message);
        }
        
        return false; // Always return false to prevent any form submission
    }
};

console.log('[BASE_VERIFY] Safe wrapper loaded');