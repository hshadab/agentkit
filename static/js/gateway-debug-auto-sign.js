// Debug script to understand why auto-signing isn't working

console.log('🔍 DEBUG: Gateway Auto-Sign Debug Script Loading...');

// Check the state of various variables
window.addEventListener('load', () => {
    console.log('🔍 DEBUG: Page loaded, checking auto-sign state...');
    
    // Check if private key is available
    console.log('window.DEMO_PRIVATE_KEY:', window.DEMO_PRIVATE_KEY);
    console.log('Type of DEMO_PRIVATE_KEY:', typeof window.DEMO_PRIVATE_KEY);
    console.log('Length:', window.DEMO_PRIVATE_KEY ? window.DEMO_PRIVATE_KEY.length : 'N/A');
    
    // Check if Gateway manager exists
    if (window.GatewayWorkflowManager) {
        console.log('✅ GatewayWorkflowManager found');
        
        // Try to get an instance if one exists
        // Usually it's created by the main app
        setTimeout(() => {
            // Check if there's a global instance
            if (window.gatewayManager) {
                console.log('Found gateway manager instance');
                console.log('  privateKey:', window.gatewayManager.privateKey);
                console.log('  userAccount:', window.gatewayManager.userAccount);
            }
            
            // Hook into the manager to log when it's used
            const originalExecute = window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer;
            
            window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer = async function(...args) {
                console.log('🚨 executeRealGatewayTransfer called!');
                console.log('  this.privateKey:', this.privateKey);
                console.log('  window.DEMO_PRIVATE_KEY:', window.DEMO_PRIVATE_KEY);
                
                // Make sure privateKey is set
                if (!this.privateKey && window.DEMO_PRIVATE_KEY) {
                    console.log('🔧 FIXING: Setting privateKey on instance');
                    this.privateKey = window.DEMO_PRIVATE_KEY;
                }
                
                return originalExecute.apply(this, args);
            };
            
            console.log('✅ Debug hooks installed');
        }, 1000);
    } else {
        console.log('❌ GatewayWorkflowManager not found');
    }
    
    // Also check the workflow manager
    setTimeout(() => {
        if (window.workflowManager) {
            console.log('Found workflowManager:');
            console.log('  Has gatewayManager:', !!window.workflowManager.gatewayManager);
            
            if (window.workflowManager.gatewayManager) {
                console.log('  gatewayManager.privateKey:', window.workflowManager.gatewayManager.privateKey);
                
                // Fix it if needed
                if (!window.workflowManager.gatewayManager.privateKey && window.DEMO_PRIVATE_KEY) {
                    console.log('🔧 FIXING: Setting privateKey on workflowManager.gatewayManager');
                    window.workflowManager.gatewayManager.privateKey = window.DEMO_PRIVATE_KEY;
                }
            }
        }
    }, 2000);
});