// Direct bypass of MetaMask for Gateway workflows
// This modifies the Gateway workflow manager to ALWAYS use programmatic signing

(function() {
    'use strict';
    
    console.log('🔐 Gateway MetaMask Bypass loading...');
    
    // The private key to use (your MetaMask wallet's key)
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    
    // Wait for GatewayWorkflowManager to exist
    const installBypass = () => {
        // Check if the class exists
        if (!window.GatewayWorkflowManager) {
            console.log('Waiting for GatewayWorkflowManager...');
            setTimeout(installBypass, 100);
            return;
        }
        
        console.log('🔧 Installing MetaMask bypass on GatewayWorkflowManager prototype...');
        
        // Store original method
        const originalExecute = window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer;
        
        // Override the method
        window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer = async function(amount, recipient, agentId, isTestnet) {
            console.log('🔐 BYPASS: executeRealGatewayTransfer called');
            console.log('   FORCING privateKey to be set...');
            
            // FORCE the private key to be set
            this.privateKey = PRIVATE_KEY;
            
            // ALSO set it globally just in case
            window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
            
            console.log('   privateKey is now:', this.privateKey.substring(0, 10) + '...');
            
            // Call the original method
            const result = await originalExecute.call(this, amount, recipient, agentId, isTestnet);
            
            return result;
        };
        
        // Also override initialize to always set the private key
        const originalInit = window.GatewayWorkflowManager.prototype.initialize;
        window.GatewayWorkflowManager.prototype.initialize = async function() {
            console.log('🔐 BYPASS: initialize called, setting privateKey');
            this.privateKey = PRIVATE_KEY;
            window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
            return originalInit.call(this);
        };
        
        console.log('✅ MetaMask bypass installed on prototype');
        
        // Also fix any existing instance
        if (window.gatewayWorkflowManager) {
            console.log('🔧 Fixing existing instance...');
            window.gatewayWorkflowManager.privateKey = PRIVATE_KEY;
            console.log('✅ Existing instance fixed');
        }
    };
    
    // Start trying to install
    installBypass();
    
    // Also install after page load
    window.addEventListener('load', () => {
        setTimeout(installBypass, 500);
        
        // Double-check the instance
        if (window.gatewayWorkflowManager && !window.gatewayWorkflowManager.privateKey) {
            console.log('🔧 Late-fixing gateway manager instance...');
            window.gatewayWorkflowManager.privateKey = PRIVATE_KEY;
        }
    });
    
    // Make sure DEMO_PRIVATE_KEY is always available
    window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
    
    console.log('🔐 MetaMask bypass ready');
    console.log('   Private key set globally');
    console.log('   Will force programmatic signing');
    
})();