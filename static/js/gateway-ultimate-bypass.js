// ULTIMATE MetaMask Bypass - Catches ALL possible paths
console.log('🔴 ULTIMATE BYPASS LOADING...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    let interceptCount = 0;
    let bypassCount = 0;
    
    // Create a fake ethereum object that logs everything
    if (window.ethereum) {
        const originalEthereum = window.ethereum;
        const originalRequest = originalEthereum.request;
        const originalSend = originalEthereum.send;
        const originalSendAsync = originalEthereum.sendAsync;
        const originalEnable = originalEthereum.enable;
        
        // Log EVERYTHING that goes through ethereum
        const logAndIntercept = async (method, params, originalFn) => {
            interceptCount++;
            console.log(`🔴 [${interceptCount}] ETHEREUM CALL INTERCEPTED:`);
            console.log(`   Method: ${method}`);
            console.log(`   Params:`, params);
            console.log(`   Stack trace:`, new Error().stack);
            
            // Check if this is a signing request
            if (method === 'eth_signTypedData_v4' || 
                method === 'eth_signTypedData_v3' || 
                method === 'eth_signTypedData' ||
                method === 'personal_sign' ||
                method === 'eth_sign') {
                
                console.log('🚨 SIGNATURE REQUEST DETECTED - WILL BYPASS!');
                bypassCount++;
                
                try {
                    // Handle different signing methods
                    if (method.includes('signTypedData')) {
                        const typedDataJson = params[1] || params[0];
                        const typedData = typeof typedDataJson === 'string' ? 
                            JSON.parse(typedDataJson) : typedDataJson;
                        
                        console.log('📝 Typed data:', typedData);
                        
                        const wallet = new ethers.Wallet(PRIVATE_KEY);
                        const signature = await wallet._signTypedData(
                            typedData.domain,
                            typedData.types,
                            typedData.message
                        );
                        
                        console.log('✅ BYPASSED! Signature:', signature.substring(0, 30) + '...');
                        console.log(`🎉 Bypass #${bypassCount} successful!`);
                        
                        return signature;
                    } else {
                        // For other sign methods, just return a dummy signature for now
                        console.log('⚠️ Non-typed sign method, returning test signature');
                        return '0x' + '00'.repeat(65);
                    }
                } catch (error) {
                    console.error('❌ Bypass error:', error);
                    return originalFn ? originalFn(method, params) : null;
                }
            }
            
            // For non-signing requests, pass through
            return originalFn ? originalFn(method, params) : null;
        };
        
        // Override request method
        originalEthereum.request = async function(args) {
            return logAndIntercept(args.method, args.params, async (m, p) => {
                return originalRequest.call(this, args);
            });
        };
        
        // Override send method
        if (originalSend) {
            originalEthereum.send = function(method, params) {
                return logAndIntercept(method, params, (m, p) => {
                    return originalSend.call(this, method, params);
                });
            };
        }
        
        // Override sendAsync method
        if (originalSendAsync) {
            originalEthereum.sendAsync = function(payload, callback) {
                const method = payload.method;
                const params = payload.params;
                
                logAndIntercept(method, params, (m, p) => {
                    return originalSendAsync.call(this, payload, callback);
                }).then(result => {
                    callback(null, { result });
                }).catch(error => {
                    callback(error);
                });
            };
        }
        
        console.log('✅ All ethereum methods intercepted');
    }
    
    // ALSO intercept at the prototype level
    if (window.GatewayWorkflowManager) {
        console.log('🔧 Patching GatewayWorkflowManager...');
        
        // Find ALL methods that might call MetaMask
        const proto = window.GatewayWorkflowManager.prototype;
        const methodsToCheck = Object.getOwnPropertyNames(proto);
        
        methodsToCheck.forEach(methodName => {
            if (typeof proto[methodName] === 'function') {
                const original = proto[methodName];
                proto[methodName] = function(...args) {
                    // Force private key before ANY method call
                    if (!this.privateKey) {
                        console.log(`🔧 Forcing privateKey in ${methodName}`);
                        this.privateKey = PRIVATE_KEY;
                    }
                    return original.apply(this, args);
                };
            }
        });
        
        console.log(`✅ Patched ${methodsToCheck.length} methods`);
    }
    
    // Create status display
    const createStatusDisplay = () => {
        const display = document.createElement('div');
        display.id = 'bypass-status';
        display.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(220, 38, 38, 0.95);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            min-width: 200px;
        `;
        
        const updateDisplay = () => {
            display.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">🔴 ULTIMATE BYPASS</div>
                <div>Intercepts: ${interceptCount}</div>
                <div>Bypasses: ${bypassCount}</div>
                <div style="margin-top: 5px; font-size: 10px;">
                    ${bypassCount > 0 ? '✅ Working!' : '⏳ Waiting...'}
                </div>
            `;
        };
        
        updateDisplay();
        document.body.appendChild(display);
        
        // Update every second
        setInterval(updateDisplay, 1000);
    };
    
    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createStatusDisplay);
    } else {
        setTimeout(createStatusDisplay, 100);
    }
    
    // NUCLEAR OPTION: Replace window.ethereum entirely
    window.enableNuclearBypass = () => {
        console.log('☢️ NUCLEAR BYPASS ENABLED - Replacing window.ethereum entirely!');
        
        const fakeEthereum = {
            isMetaMask: true,
            selectedAddress: '0xe616b2ec620621797030e0ab1ba38da68d78351c',
            
            request: async (args) => {
                console.log('☢️ FAKE ETHEREUM:', args.method);
                
                if (args.method === 'eth_requestAccounts') {
                    return ['0xe616b2ec620621797030e0ab1ba38da68d78351c'];
                }
                
                if (args.method === 'eth_accounts') {
                    return ['0xe616b2ec620621797030e0ab1ba38da68d78351c'];
                }
                
                if (args.method.includes('sign')) {
                    console.log('☢️ NUCLEAR BYPASS - Returning fake signature');
                    return '0x' + '42'.repeat(65);
                }
                
                // Pass through to original for other methods
                if (window._originalEthereum) {
                    return window._originalEthereum.request(args);
                }
                
                return null;
            },
            
            on: () => {},
            removeListener: () => {},
        };
        
        window._originalEthereum = window.ethereum;
        window.ethereum = fakeEthereum;
        console.log('☢️ window.ethereum replaced with fake!');
    };
    
    console.log('🔴 ULTIMATE BYPASS READY!');
    console.log('   - Intercepts ALL ethereum calls');
    console.log('   - Shows counter in top-right');
    console.log('   - Run window.enableNuclearBypass() for nuclear option');
    
})();