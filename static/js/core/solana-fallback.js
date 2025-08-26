// Solana Web3.js fallback loader
(function() {
    // Check if Solana Web3.js loaded successfully
    setTimeout(function() {
        if (typeof solanaWeb3 === 'undefined' && typeof window.solanaWeb3 === 'undefined') {
            console.warn('Solana Web3.js not loaded, trying alternative CDN...');
            
            // Try alternative CDNs
            const alternatives = [
                'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.js',
                'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.78.0/lib/index.iife.min.js',
                'https://unpkg.com/@solana/web3.js@1.87.6/lib/index.iife.js'
            ];
            
            let attemptIndex = 0;
            
            function tryNextCDN() {
                if (attemptIndex >= alternatives.length) {
                    console.error('Failed to load Solana Web3.js from all CDNs');
                    // Create a stub to prevent errors
                    window.solanaWeb3 = {
                        Connection: function() {},
                        PublicKey: function() {},
                        Transaction: function() {},
                        SystemProgram: {},
                        LAMPORTS_PER_SOL: 1000000000
                    };
                    return;
                }
                
                const script = document.createElement('script');
                script.src = alternatives[attemptIndex];
                script.onerror = function() {
                    console.warn('Failed to load from:', alternatives[attemptIndex]);
                    attemptIndex++;
                    tryNextCDN();
                };
                script.onload = function() {
                    console.log('✅ Solana Web3.js loaded from:', alternatives[attemptIndex]);
                };
                document.head.appendChild(script);
            }
            
            tryNextCDN();
        } else {
            console.log('✅ Solana Web3.js already loaded');
        }
    }, 2000);
})();