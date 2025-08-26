// Device Registration Monitor - Logs detailed info about device registrations

(function() {
    console.log('🔍 Device Registration Monitor Active');
    
    // Store original registerDevice function
    if (window.IoTeXDeviceVerifier) {
        const OriginalVerifier = window.IoTeXDeviceVerifier;
        
        window.IoTeXDeviceVerifier = class extends OriginalVerifier {
            async registerDevice(deviceId, deviceType) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📱 DEVICE REGISTRATION MONITOR');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`Device ID: ${deviceId}`);
                console.log(`Device Type: ${deviceType || 'sensor'}`);
                console.log(`Timestamp: ${new Date().toISOString()}`);
                
                const startTime = Date.now();
                
                try {
                    // Call original function
                    const result = await super.registerDevice(deviceId, deviceType);
                    
                    const duration = Date.now() - startTime;
                    console.log(`\n✅ Registration Result:`);
                    console.log(`Duration: ${duration}ms`);
                    console.log(`Already Registered: ${result.alreadyRegistered || false}`);
                    console.log(`ioID: ${result.ioId}`);
                    console.log(`DID: ${result.did}`);
                    console.log(`TX Hash: ${result.verifierTxHash || result.txHash || 'N/A'}`);
                    console.log(`Device ID Bytes32: ${result.deviceIdBytes32}`);
                    
                    if (result.alreadyRegistered) {
                        console.log('⚠️  Device was already registered - no new transaction created');
                    } else {
                        console.log('🆕 New device registration - blockchain transaction created');
                    }
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    
                    return result;
                } catch (error) {
                    const duration = Date.now() - startTime;
                    console.log(`\n❌ Registration Failed:`);
                    console.log(`Duration: ${duration}ms`);
                    console.log(`Error: ${error.message}`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    throw error;
                }
            }
        };
        
        // Also monitor the contract calls directly
        const originalConnect = OriginalVerifier.prototype.connect;
        OriginalVerifier.prototype.connect = async function() {
            await originalConnect.call(this);
            
            if (this.contract && !this.contract._monitored) {
                const originalRegisterDevice = this.contract.registerDevice;
                this.contract.registerDevice = async function(...args) {
                    console.log('📝 Direct Contract Call: registerDevice');
                    console.log('Arguments:', args);
                    const result = await originalRegisterDevice.apply(this, args);
                    console.log('Transaction Object:', result);
                    return result;
                };
                this.contract._monitored = true;
            }
        };
    }
    
    // Monitor WebSocket messages related to device registration
    if (window.wsManager) {
        const originalOn = window.wsManager.on;
        window.wsManager.on = function(event, handler) {
            if (event === 'device_registration_request') {
                const wrappedHandler = async function(data) {
                    console.log('📨 WebSocket: device_registration_request', data);
                    return handler.call(this, data);
                };
                return originalOn.call(this, event, wrappedHandler);
            }
            return originalOn.call(this, event, handler);
        };
    }
})();