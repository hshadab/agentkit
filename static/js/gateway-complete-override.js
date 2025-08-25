// COMPLETE Gateway override - replaces ALL ethereum.request calls
console.log('🔥 COMPLETE GATEWAY OVERRIDE loading...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const EXPECTED_ADDRESS = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
    
    // Install override immediately
    const installOverride = () => {
        console.log('🔥 Installing complete override immediately...');
        
        // Create wallet once
        const wallet = new ethers.Wallet(PRIVATE_KEY);
        console.log('🔥 Wallet created:', wallet.address);
        
        // Store original ethereum object
        const originalEthereum = window.ethereum;
        
        // Create proxy that intercepts ALL calls
        window.ethereum = new Proxy(originalEthereum, {
            get(target, prop) {
                if (prop === 'request') {
                    return async function(args) {
                        console.log('🔥 INTERCEPTED ethereum.request:', args.method);
                        
                        // Handle signing requests
                        if (args.method === 'eth_signTypedData_v4') {
                            console.log('🔥 PROGRAMMATIC SIGNING - NO METAMASK!');
                            const [account, typedDataJson] = args.params;
                            
                            try {
                                const typedData = JSON.parse(typedDataJson);
                                console.log('🔥 Signing with private key for account:', account);
                                console.log('🔥 TypedData domain:', typedData.domain);
                                
                                // Sign with our wallet
                                const signature = await wallet._signTypedData(
                                    typedData.domain,
                                    typedData.types,
                                    typedData.message
                                );
                                
                                console.log('🔥 Signature created programmatically:', signature.substring(0, 30) + '...');
                                return signature;
                                
                            } catch (error) {
                                console.error('🔥 Signing error:', error);
                                throw error;
                            }
                        }
                        
                        // Handle account requests
                        if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
                            console.log('🔥 Returning programmatic account');
                            return [EXPECTED_ADDRESS];
                        }
                        
                        // Handle chain ID
                        if (args.method === 'eth_chainId') {
                            return '0x1'; // Return mainnet ID
                        }
                        
                        // Pass through other requests
                        console.log('🔥 Passing through:', args.method);
                        return originalEthereum.request(args);
                    };
                }
                
                // Pass through other properties
                return target[prop];
            }
        });
        
        // Also override the GatewayWorkflowManager class
        const overrideClass = () => {
            if (!window.GatewayWorkflowManager) {
                setTimeout(overrideClass, 50);
                return;
            }
            
            const OriginalClass = window.GatewayWorkflowManager;
            
            // Override the prototype method directly
            if (OriginalClass.prototype.executeRealGatewayTransfer) {
                const originalMethod = OriginalClass.prototype.executeRealGatewayTransfer;
                
                OriginalClass.prototype.executeRealGatewayTransfer = async function(...args) {
                    console.log('🔥 Forcing private key in executeRealGatewayTransfer');
                    this.privateKey = PRIVATE_KEY;
                    window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
                    
                    // Call original method
                    return originalMethod.apply(this, args);
                };
            }
            
            console.log('🔥 GatewayWorkflowManager overridden');
        };
        
        overrideClass();
        
        // Set global private key
        window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
        
        console.log('🔥 COMPLETE OVERRIDE INSTALLED');
        console.log('   - ethereum.request intercepted');
        console.log('   - Private key set globally');
        console.log('   - GatewayWorkflowManager patched');
    };
    
    // Check if ethers is available
    if (window.ethers) {
        console.log('🔥 Ethers already available, installing override now');
        installOverride();
    } else {
        console.log('🔥 Ethers not yet available, waiting...');
        // Wait for ethers then install
        const checkEthers = setInterval(() => {
            if (window.ethers) {
                clearInterval(checkEthers);
                installOverride();
            }
        }, 10);
    }
    
})();