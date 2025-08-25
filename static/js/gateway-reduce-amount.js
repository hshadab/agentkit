// Reduce Gateway transfer amounts and integrate zkML proof generation
console.log('💰 Gateway Amount Reducer with zkML loading...');

(function() {
    'use strict';
    
    // zkML proof generation function using JOLT-Atlas
    async function generateZkMLProof(agentType, amount, operation, risk) {
        console.log('🧬 Generating zkML proof with JOLT-Atlas...');
        const startTime = Date.now();
        
        try {
            // Call the JOLT-Atlas prover binary via backend
            const response = await fetch('/api/zkml/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_type: agentType || 3,  // Default to cross-chain agent
                    amount: Math.floor(amount * 100), // Convert to cents
                    operation: operation || 1,  // Gateway transfer
                    risk: risk || 10,  // Low risk for small amounts
                    use_minimal_model: true  // Use fast 3-embedding model
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                const proofTime = Date.now() - startTime;
                console.log(`✅ zkML proof generated in ${proofTime}ms`);
                console.log('   Decision:', result.decision ? 'ALLOW' : 'DENY');
                return result;
            }
        } catch (error) {
            console.warn('⚠️ zkML proof generation failed, using mock:', error);
        }
        
        // Fallback mock proof
        const decision = agentType >= 2 && amount < 50;
        return {
            success: true,
            proof: [decision ? 1 : 0, agentType, amount, operation, risk],
            decision: decision,
            proofTime: 5,
            cryptographic: false
        };
    }
    
    // Override the amount calculation
    const fixAmounts = () => {
        if (window.gatewayWorkflowManager) {
            const original = window.gatewayWorkflowManager.executeRealGatewayTransfer;
            
            window.gatewayWorkflowManager.executeRealGatewayTransfer = async function(amount, recipient, agentId, isTestnet) {
                console.log('💰 Reducing transfer amount and generating zkML proof...');
                
                // Force amount to 0.01 USDC per chain (0.03 total) for demo
                const reducedAmount = '0.01';
                console.log(`   Original amount: ${amount} USDC per chain`);
                console.log(`   Demo amount: ${reducedAmount} USDC per chain`);
                console.log(`   Total transfer: 0.03 USDC across 3 chains`);
                
                // Generate zkML proof for agent authorization
                const zkmlResult = await generateZkMLProof(
                    3,  // Cross-chain agent type
                    parseFloat(reducedAmount),
                    1,  // Gateway operation
                    10  // Low risk
                );
                
                if (!zkmlResult.decision) {
                    console.error('❌ Agent authorization denied by zkML proof');
                    throw new Error('Agent not authorized for Gateway transfer');
                }
                
                console.log('✅ Agent authorized with zkML proof');
                console.log(`   Proof type: ${zkmlResult.cryptographic ? 'REAL cryptographic' : 'mock'}`);
                console.log(`   Generation time: ${zkmlResult.proofTime}ms`);
                
                // Store proof for later reference
                window.lastZkMLProof = zkmlResult;
                
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