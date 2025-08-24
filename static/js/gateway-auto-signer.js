// Gateway Auto-Signer Module
// Enables automatic programmatic signing for Gateway workflows
// This avoids the need for 3 MetaMask confirmations

(function() {
    'use strict';
    
    console.log('🤖 Gateway Auto-Signer initializing...');
    
    // Check if programmatic signing is available
    const checkProgrammaticSigning = () => {
        const privateKey = window.DEMO_PRIVATE_KEY;
        
        if (!privateKey) {
            console.log('⚠️ No private key configured for auto-signing');
            return false;
        }
        
        if (!window.ethers) {
            console.log('⚠️ Ethers.js not loaded, cannot use auto-signing');
            return false;
        }
        
        try {
            const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
            const wallet = new ethers.Wallet(formattedKey);
            console.log('✅ Auto-signing enabled with wallet:', wallet.address);
            
            // Verify it matches the expected address
            const expectedAddress = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
            if (wallet.address.toLowerCase() === expectedAddress) {
                console.log('✅ Wallet address matches your MetaMask account');
                return true;
            } else {
                console.log('⚠️ Wallet address does not match expected MetaMask account');
                return false;
            }
        } catch (error) {
            console.error('❌ Error creating wallet from private key:', error);
            return false;
        }
    };
    
    // Override the Gateway workflow manager to force programmatic signing
    const enableAutoSigning = () => {
        // Wait for the GatewayWorkflowManager to be defined
        const checkInterval = setInterval(() => {
            if (window.GatewayWorkflowManager) {
                clearInterval(checkInterval);
                
                const originalExecute = window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer;
                
                window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer = async function(...args) {
                    console.log('🤖 Auto-signer intercepting Gateway transfer...');
                    
                    // Ensure the private key is available to the workflow
                    if (window.DEMO_PRIVATE_KEY && !this.privateKey) {
                        this.privateKey = window.DEMO_PRIVATE_KEY;
                        console.log('🔑 Injected private key into workflow manager');
                    }
                    
                    // Call the original method
                    return originalExecute.apply(this, args);
                };
                
                console.log('✅ Gateway Auto-Signer installed successfully');
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (checkProgrammaticSigning()) {
                enableAutoSigning();
            }
        });
    } else {
        if (checkProgrammaticSigning()) {
            enableAutoSigning();
        }
    }
    
    // Also expose a manual toggle for testing
    window.toggleGatewayAutoSigning = (enable) => {
        if (enable) {
            if (!window.DEMO_PRIVATE_KEY) {
                console.error('Cannot enable auto-signing: No private key configured');
                return false;
            }
            enableAutoSigning();
            console.log('✅ Auto-signing enabled');
            return true;
        } else {
            // Reset to original
            if (window.GatewayWorkflowManager && window.GatewayWorkflowManager.prototype._originalExecute) {
                window.GatewayWorkflowManager.prototype.executeRealGatewayTransfer = 
                    window.GatewayWorkflowManager.prototype._originalExecute;
                console.log('✅ Auto-signing disabled');
            }
            return false;
        }
    };
    
    // Add visual indicator
    window.addEventListener('load', () => {
        if (window.DEMO_PRIVATE_KEY && checkProgrammaticSigning()) {
            // Add a small indicator to the UI
            const indicator = document.createElement('div');
            indicator.id = 'auto-signing-indicator';
            indicator.innerHTML = '🤖 Auto-Signing Enabled';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(34, 197, 94, 0.1);
                color: #22c55e;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-family: monospace;
                border: 1px solid rgba(34, 197, 94, 0.3);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(indicator);
            
            // Add click handler to toggle
            indicator.style.cursor = 'pointer';
            indicator.onclick = () => {
                const enabled = indicator.innerHTML.includes('Enabled');
                if (enabled) {
                    window.toggleGatewayAutoSigning(false);
                    indicator.innerHTML = '🔒 Auto-Signing Disabled';
                    indicator.style.background = 'rgba(239, 68, 68, 0.1)';
                    indicator.style.color = '#ef4444';
                    indicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                } else {
                    window.toggleGatewayAutoSigning(true);
                    indicator.innerHTML = '🤖 Auto-Signing Enabled';
                    indicator.style.background = 'rgba(34, 197, 94, 0.1)';
                    indicator.style.color = '#22c55e';
                    indicator.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                }
            };
        }
    });
    
})();