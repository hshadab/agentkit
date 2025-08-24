// Direct method override to prevent MetaMask calls
console.log('🎯 METHOD OVERRIDE LOADING...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    
    // Wait for everything to load
    const installOverrides = () => {
        console.log('🎯 Installing method overrides...');
        
        // Override window.ethereum.request BEFORE other scripts use it
        if (window.ethereum && window.ethereum.request) {
            const originalRequest = window.ethereum.request.bind(window.ethereum);
            
            // Create our override
            window.ethereum.request = async function(args) {
                console.log(`🎯 ethereum.request called:`, args);
                
                // If it's a signing request, handle it ourselves
                if (args && args.method && args.method.includes('sign')) {
                    console.log('🚫 BLOCKING METAMASK POPUP!');
                    
                    if (args.method === 'eth_signTypedData_v4') {
                        try {
                            // Parse the data
                            const account = args.params[0];
                            const typedDataJson = args.params[1];
                            const typedData = typeof typedDataJson === 'string' ? 
                                JSON.parse(typedDataJson) : typedDataJson;
                            
                            console.log('🔐 Signing with private key instead...');
                            
                            // Create wallet and sign
                            const wallet = new ethers.Wallet(PRIVATE_KEY);
                            
                            // Sign the typed data
                            const signature = await wallet._signTypedData(
                                typedData.domain,
                                typedData.types,
                                typedData.message
                            );
                            
                            console.log('✅ Signed without MetaMask!');
                            return signature;
                            
                        } catch (error) {
                            console.error('❌ Override error:', error);
                            // Fall back to original
                            return originalRequest(args);
                        }
                    }
                }
                
                // For non-signing requests, use original
                return originalRequest(args);
            };
            
            console.log('✅ ethereum.request overridden');
        }
        
        // ALSO override the Gateway manager's methods directly
        if (window.gatewayWorkflowManager) {
            console.log('🎯 Overriding gatewayWorkflowManager methods...');
            
            // Make sure it has the private key
            window.gatewayWorkflowManager.privateKey = PRIVATE_KEY;
            
            // Override executeRealGatewayTransfer
            const originalExecute = window.gatewayWorkflowManager.executeRealGatewayTransfer;
            window.gatewayWorkflowManager.executeRealGatewayTransfer = async function(...args) {
                console.log('🎯 executeRealGatewayTransfer OVERRIDE');
                this.privateKey = PRIVATE_KEY; // FORCE IT
                
                // Also set it globally
                window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
                
                return originalExecute.apply(this, args);
            };
            
            console.log('✅ Gateway manager methods overridden');
        } else {
            console.log('⏳ Gateway manager not ready, retrying...');
            setTimeout(installOverrides, 200);
        }
    };
    
    // Install as early as possible
    installOverrides();
    
    // Also install after various load events
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(installOverrides, 100);
    });
    
    window.addEventListener('load', () => {
        setTimeout(installOverrides, 200);
    });
    
    // Expose a manual trigger
    window.forceInstallOverrides = installOverrides;
    
    console.log('🎯 METHOD OVERRIDE READY');
    
})();