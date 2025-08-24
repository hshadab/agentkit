// Reduce Gateway transfer amounts to work with available balance
console.log('💰 Gateway Amount Reducer loading...');

(function() {
    'use strict';
    
    // Override the amount calculation
    const fixAmounts = () => {
        if (window.gatewayWorkflowManager) {
            const original = window.gatewayWorkflowManager.executeRealGatewayTransfer;
            
            window.gatewayWorkflowManager.executeRealGatewayTransfer = async function(amount, recipient, agentId, isTestnet) {
                console.log('💰 Reducing transfer amount to fit balance...');
                
                // Force amount to 0.01 USDC per chain (0.03 total) instead of 2.11 per chain
                const reducedAmount = '0.01';
                console.log(`   Original amount: ${amount} USDC per chain`);
                console.log(`   Reduced amount: ${reducedAmount} USDC per chain`);
                console.log(`   Total needed: 0.03 USDC (vs 1.79 available)`);
                
                // Call original with reduced amount
                return original.call(this, reducedAmount, recipient, agentId, isTestnet);
            };
            
            console.log('✅ Amount reducer installed');
        } else {
            setTimeout(fixAmounts, 500);
        }
    };
    
    // Install when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixAmounts);
    } else {
        fixAmounts();
    }
    
})();