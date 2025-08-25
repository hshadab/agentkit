// EARLY ethereum interceptor - must run BEFORE anything else
console.log('🚨 EARLY INTERCEPT: Installing ethereum proxy...');

(function() {
    'use strict';
    
    // Store original ethereum immediately
    const originalEthereum = window.ethereum;
    
    if (!originalEthereum) {
        console.log('🚨 No ethereum object yet, waiting...');
        // Poll for ethereum object
        const pollForEthereum = setInterval(() => {
            if (window.ethereum) {
                clearInterval(pollForEthereum);
                console.log('🚨 Ethereum detected, intercepting...');
                interceptEthereum();
            }
        }, 10);
        return;
    }
    
    function interceptEthereum() {
        const originalEthereum = window.ethereum;
        const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
        const EXPECTED_ADDRESS = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
        
        // Store original request method
        const originalRequest = originalEthereum.request.bind(originalEthereum);
        
        // Replace request method
        window.ethereum.request = async function(args) {
            console.log('🚨 EARLY INTERCEPT:', args.method);
            
            // Intercept signing requests
            if (args.method === 'eth_signTypedData_v4') {
                console.log('🚨 BLOCKING METAMASK - Will sign programmatically');
                
                // Wait for ethers if not available
                if (!window.ethers) {
                    console.log('🚨 Waiting for ethers library...');
                    await new Promise(resolve => {
                        const check = setInterval(() => {
                            if (window.ethers) {
                                clearInterval(check);
                                resolve();
                            }
                        }, 50);
                    });
                }
                
                try {
                    const [account, typedDataJson] = args.params;
                    const typedData = JSON.parse(typedDataJson);
                    
                    console.log('🚨 Creating wallet with private key');
                    const wallet = new ethers.Wallet(PRIVATE_KEY);
                    
                    console.log('🚨 Signing typed data programmatically');
                    const signature = await wallet._signTypedData(
                        typedData.domain,
                        typedData.types,
                        typedData.message
                    );
                    
                    console.log('🚨 Signature created WITHOUT MetaMask:', signature.substring(0, 30) + '...');
                    return signature;
                    
                } catch (error) {
                    console.error('🚨 Signing error:', error);
                    throw error;
                }
            }
            
            // Intercept account requests
            if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
                console.log('🚨 Returning programmatic account');
                return [EXPECTED_ADDRESS];
            }
            
            // Pass through other requests
            console.log('🚨 Passing through:', args.method);
            return originalRequest(args);
        };
        
        console.log('🚨 EARLY INTERCEPT COMPLETE - ethereum.request replaced');
    }
    
    // Intercept immediately if ethereum exists
    interceptEthereum();
    
})();