// FORCE programmatic signing for Gateway - no conditions
console.log('⚡ FORCE PROGRAMMATIC SIGNING loading...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    
    // Override the GatewayWorkflowManager class itself
    const overrideClass = () => {
        if (!window.GatewayWorkflowManager) {
            console.log('Waiting for GatewayWorkflowManager class...');
            setTimeout(overrideClass, 50);
            return;
        }
        
        console.log('⚡ Overriding GatewayWorkflowManager class...');
        
        // Save original class
        const OriginalClass = window.GatewayWorkflowManager;
        
        // Create new class that extends original
        window.GatewayWorkflowManager = class extends OriginalClass {
            constructor(...args) {
                super(...args);
                console.log('⚡ GatewayWorkflowManager instance created with forced private key');
                this.privateKey = PRIVATE_KEY;
            }
            
            async executeRealGatewayTransfer(...args) {
                console.log('⚡ FORCING PROGRAMMATIC SIGNING');
                this.privateKey = PRIVATE_KEY;
                window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
                
                // Call parent method
                const result = await super.executeRealGatewayTransfer(...args);
                return result;
            }
            
            async initialize() {
                console.log('⚡ Initialize with forced private key');
                this.privateKey = PRIVATE_KEY;
                window.DEMO_PRIVATE_KEY = PRIVATE_KEY;
                return super.initialize();
            }
        };
        
        console.log('✅ GatewayWorkflowManager class overridden');
        
        // Also fix any existing instance
        if (window.gatewayWorkflowManager) {
            window.gatewayWorkflowManager.privateKey = PRIVATE_KEY;
            console.log('✅ Existing instance fixed');
        }
    };
    
    // Start immediately
    overrideClass();
    
    // Also ensure DEMO_PRIVATE_KEY is always set
    Object.defineProperty(window, 'DEMO_PRIVATE_KEY', {
        get: function() {
            return PRIVATE_KEY;
        },
        set: function(val) {
            // Ignore attempts to unset it
            console.log('⚡ Attempt to set DEMO_PRIVATE_KEY blocked, keeping our value');
        },
        configurable: false
    });
    
    console.log('⚡ FORCE PROGRAMMATIC ready');
    
})();