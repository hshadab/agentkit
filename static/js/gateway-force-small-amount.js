// FORCE small amounts for Gateway demo
console.log('💵 FORCING SMALL GATEWAY AMOUNTS...');

(function() {
    'use strict';
    
    // Override the GatewayWorkflowManager class constructor and methods
    const overrideClass = () => {
        if (!window.GatewayWorkflowManager) {
            setTimeout(overrideClass, 50);
            return;
        }
        
        console.log('💵 Patching GatewayWorkflowManager for small amounts...');
        
        const OriginalClass = window.GatewayWorkflowManager;
        
        // Save original prototype method
        const originalExecute = OriginalClass.prototype.executeRealGatewayTransfer;
        
        // Override the method
        OriginalClass.prototype.executeRealGatewayTransfer = async function(amount, recipient, agentId, isTestnet) {
            console.log('💵 INTERCEPTED executeRealGatewayTransfer');
            console.log('💵 Original amount requested:', amount);
            
            // FORCE small amount
            const forcedAmount = '0.01';
            console.log('💵 FORCING amount to:', forcedAmount, 'USDC per chain');
            console.log('💵 Total for 3 chains: 0.03 USDC');
            
            // Patch the balance check by temporarily modifying parseFloat
            const originalParseFloat = window.parseFloat;
            let callCount = 0;
            
            window.parseFloat = function(value) {
                callCount++;
                // First call is for deploymentAmountPerChain
                if (callCount === 1 && value === amount) {
                    console.log('💵 Intercepting parseFloat for amount:', value, '-> returning', forcedAmount);
                    window.parseFloat = originalParseFloat; // Restore immediately
                    return originalParseFloat(forcedAmount);
                }
                return originalParseFloat(value);
            };
            
            // Call original with ORIGINAL amount (but parseFloat is patched)
            try {
                const result = await originalExecute.call(this, amount, recipient, agentId, isTestnet);
                return result;
            } finally {
                // Ensure parseFloat is restored
                window.parseFloat = originalParseFloat;
            }
        };
        
        console.log('💵 Amount override installed successfully');
        
        // Also patch any existing instance
        if (window.gatewayWorkflowManager) {
            // No need to patch instance, prototype method is shared
            console.log('💵 Existing instance will use patched method');
        }
    };
    
    // Start patching
    overrideClass();
    
})();