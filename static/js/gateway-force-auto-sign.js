// AGGRESSIVE Gateway Auto-Sign Fix
// This will FORCE programmatic signing and prevent MetaMask popups

(function() {
    'use strict';
    
    console.log('🚨 AGGRESSIVE AUTO-SIGN FIX LOADING...');
    
    // Store the original ethereum request method
    const originalRequest = window.ethereum ? window.ethereum.request : null;
    
    // Flag to control whether to intercept
    let interceptEnabled = true;
    
    // Override ethereum.request to intercept signing requests
    if (window.ethereum) {
        window.ethereum.request = async function(args) {
            console.log('🔍 Ethereum request intercepted:', args.method);
            
            // Check if this is a signing request we want to intercept
            if (interceptEnabled && args.method === 'eth_signTypedData_v4') {
                console.log('🚨 INTERCEPTING eth_signTypedData_v4 - will use programmatic signing instead!');
                
                // Check if we have the private key
                if (!window.DEMO_PRIVATE_KEY) {
                    console.error('❌ No DEMO_PRIVATE_KEY available, cannot intercept');
                    return originalRequest.call(this, args);
                }
                
                try {
                    // Parse the typed data
                    const typedDataJson = args.params[1];
                    const typedData = typeof typedDataJson === 'string' ? 
                        JSON.parse(typedDataJson) : typedDataJson;
                    
                    console.log('📝 Typed data to sign:', typedData);
                    
                    // Create wallet from private key
                    const formattedKey = window.DEMO_PRIVATE_KEY.startsWith('0x') ? 
                        window.DEMO_PRIVATE_KEY : '0x' + window.DEMO_PRIVATE_KEY;
                    const wallet = new ethers.Wallet(formattedKey);
                    
                    console.log('🔑 Using wallet:', wallet.address);
                    
                    // Sign with the wallet
                    const signature = await wallet._signTypedData(
                        typedData.domain,
                        typedData.types,
                        typedData.message
                    );
                    
                    console.log('✅ Signature created programmatically:', signature.substring(0, 30) + '...');
                    console.log('🎉 AVOIDED METAMASK POPUP!');
                    
                    // Return the signature as if MetaMask signed it
                    return signature;
                    
                } catch (error) {
                    console.error('❌ Error in programmatic signing:', error);
                    // Fall back to MetaMask
                    return originalRequest.call(this, args);
                }
            }
            
            // For all other requests, pass through to original
            return originalRequest.call(this, args);
        };
        
        console.log('✅ MetaMask request interceptor installed');
    }
    
    // Also fix the gateway manager directly
    const forceFixGatewayManager = () => {
        if (window.gatewayWorkflowManager) {
            console.log('🔧 Force-fixing gatewayWorkflowManager...');
            
            // Set the private key
            window.gatewayWorkflowManager.privateKey = window.DEMO_PRIVATE_KEY || 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
            console.log('✅ Set privateKey:', window.gatewayWorkflowManager.privateKey.substring(0, 10) + '...');
            
            // Override the executeRealGatewayTransfer method
            const original = window.gatewayWorkflowManager.executeRealGatewayTransfer;
            window.gatewayWorkflowManager.executeRealGatewayTransfer = async function(...args) {
                console.log('🚨 executeRealGatewayTransfer intercepted');
                console.log('   Forcing privateKey to be set...');
                this.privateKey = window.DEMO_PRIVATE_KEY || 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
                return original.apply(this, args);
            };
            
            console.log('✅ Gateway manager force-fixed');
        } else {
            console.log('⏳ Gateway manager not ready, retrying...');
            setTimeout(forceFixGatewayManager, 500);
        }
    };
    
    // Apply fixes when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(forceFixGatewayManager, 100);
        });
    } else {
        setTimeout(forceFixGatewayManager, 100);
    }
    
    // Expose control functions
    window.toggleMetaMaskIntercept = (enable) => {
        interceptEnabled = enable;
        console.log(`MetaMask intercept ${enable ? 'ENABLED' : 'DISABLED'}`);
    };
    
    // Add visual indicator
    window.addEventListener('load', () => {
        const indicator = document.createElement('div');
        indicator.innerHTML = '🚨 FORCE AUTO-SIGN ACTIVE';
        indicator.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-family: monospace;
            font-weight: bold;
            z-index: 10001;
            cursor: pointer;
        `;
        indicator.onclick = () => {
            interceptEnabled = !interceptEnabled;
            indicator.innerHTML = interceptEnabled ? 
                '🚨 FORCE AUTO-SIGN ACTIVE' : 
                '⏸️ FORCE AUTO-SIGN PAUSED';
            indicator.style.background = interceptEnabled ? 
                'rgba(239, 68, 68, 0.9)' : 
                'rgba(100, 100, 100, 0.9)';
        };
        document.body.appendChild(indicator);
    });
    
    console.log('🚨 AGGRESSIVE AUTO-SIGN FIX READY!');
    console.log('   - MetaMask signing requests will be intercepted');
    console.log('   - Programmatic signing will be used instead');
    console.log('   - NO POPUPS WILL APPEAR');
    
})();