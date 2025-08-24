// Gateway Auto-Sign Fix
// This ensures the private key is properly set on the gateway manager instance

(function() {
    'use strict';
    
    console.log('🔧 Gateway Auto-Sign Fix loading...');
    
    // Wait for everything to be loaded
    const fixAutoSigning = () => {
        // Check if we have the private key
        if (!window.DEMO_PRIVATE_KEY) {
            console.log('⚠️ No DEMO_PRIVATE_KEY found, auto-signing not available');
            return;
        }
        
        console.log('✅ DEMO_PRIVATE_KEY found:', window.DEMO_PRIVATE_KEY.substring(0, 10) + '...');
        
        // Check if gatewayWorkflowManager exists
        if (window.gatewayWorkflowManager) {
            console.log('✅ Found gatewayWorkflowManager');
            
            // Set the private key on the instance
            if (!window.gatewayWorkflowManager.privateKey) {
                window.gatewayWorkflowManager.privateKey = window.DEMO_PRIVATE_KEY;
                console.log('🔧 Set privateKey on gatewayWorkflowManager');
            } else {
                console.log('✅ privateKey already set on gatewayWorkflowManager');
            }
            
            // Also ensure it's set when initialize is called
            const originalInitialize = window.gatewayWorkflowManager.initialize;
            window.gatewayWorkflowManager.initialize = async function() {
                console.log('🔧 Initialize called, ensuring privateKey is set');
                if (!this.privateKey && window.DEMO_PRIVATE_KEY) {
                    this.privateKey = window.DEMO_PRIVATE_KEY;
                    console.log('🔧 Set privateKey in initialize');
                }
                return originalInitialize.call(this);
            };
            
            // Hook into executeRealGatewayTransfer to ensure privateKey is used
            const originalExecute = window.gatewayWorkflowManager.executeRealGatewayTransfer;
            window.gatewayWorkflowManager.executeRealGatewayTransfer = async function(...args) {
                console.log('🔧 executeRealGatewayTransfer called');
                console.log('   this.privateKey before:', this.privateKey ? 'SET' : 'NOT SET');
                
                // Ensure privateKey is set
                if (!this.privateKey && window.DEMO_PRIVATE_KEY) {
                    this.privateKey = window.DEMO_PRIVATE_KEY;
                    console.log('🔧 Set privateKey just before execution');
                }
                
                console.log('   this.privateKey after:', this.privateKey ? 'SET' : 'NOT SET');
                
                // Call the original method
                return originalExecute.apply(this, args);
            };
            
            console.log('✅ Auto-signing fix applied successfully');
            
            // Verify it works
            if (window.ethers) {
                try {
                    const formattedKey = window.DEMO_PRIVATE_KEY.startsWith('0x') ? 
                        window.DEMO_PRIVATE_KEY : '0x' + window.DEMO_PRIVATE_KEY;
                    const wallet = new ethers.Wallet(formattedKey);
                    console.log('✅ Wallet address from private key:', wallet.address);
                    console.log('   Expected: 0xE616B2eC620621797030E0AB1BA38DA68D78351C');
                    
                    if (wallet.address.toLowerCase() === '0xe616b2ec620621797030e0ab1ba38da68d78351c') {
                        console.log('✅ Private key matches expected MetaMask account');
                        console.log('🎉 AUTO-SIGNING IS READY - No MetaMask popups will appear!');
                    } else {
                        console.warn('⚠️ Private key does not match expected account');
                    }
                } catch (error) {
                    console.error('❌ Error verifying private key:', error);
                }
            }
        } else {
            console.log('⚠️ gatewayWorkflowManager not found yet, retrying...');
            // Retry in a bit
            setTimeout(fixAutoSigning, 500);
        }
    };
    
    // Try to fix it when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(fixAutoSigning, 100);
        });
    } else {
        setTimeout(fixAutoSigning, 100);
    }
    
    // Also try after window load
    window.addEventListener('load', () => {
        setTimeout(fixAutoSigning, 500);
    });
    
})();