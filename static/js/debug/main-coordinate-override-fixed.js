// Main Coordinate Override Fixed - Safely overrides coordinate extraction

(function() {
    console.log('🎯 Main Coordinate Override (Fixed) Active');
    
    // Wait for wsManager to be fully initialized
    const checkInterval = setInterval(() => {
        if (window.wsManager && window.wsManager.on) {
            clearInterval(checkInterval);
            // Wait a bit more to ensure handlers are registered
            setTimeout(applyOverrides, 1000);
        }
    }, 100);
    
    function applyOverrides() {
        console.log('🎯 Attempting to apply coordinate overrides');
        
        // Safer way to intercept - wrap the 'on' method
        const originalOn = window.wsManager.on;
        window.wsManager.on = function(event, handler) {
            if (event === 'iotex_verification_request') {
                console.log('🎯 Wrapping IoTeX verification handler');
                
                const wrappedHandler = async function(data) {
                    console.log('🎯 Intercepting IoTeX verification request');
                    
                    // Check for forced coordinates
                    let forcedX = null, forcedY = null;
                    
                    // Check all sources
                    if (window.DEVICE_COORDINATES) {
                        forcedX = window.DEVICE_COORDINATES.x;
                        forcedY = window.DEVICE_COORDINATES.y;
                        console.log('🎯 Using DEVICE_COORDINATES:', window.DEVICE_COORDINATES);
                    } else if (window.forcedCoordinates) {
                        forcedX = window.forcedCoordinates.x;
                        forcedY = window.forcedCoordinates.y;
                        console.log('🎯 Using forcedCoordinates:', window.forcedCoordinates);
                    } else {
                        const forcedCoordsStr = localStorage.getItem('forceCoordinates');
                        if (forcedCoordsStr) {
                            try {
                                const coords = JSON.parse(forcedCoordsStr);
                                forcedX = coords.x;
                                forcedY = coords.y;
                                console.log('🎯 Using localStorage coordinates:', coords);
                            } catch (e) {}
                        }
                    }
                    
                    // If we have forced coordinates, inject them
                    if (forcedX && forcedY && window.iotexDeviceVerifier) {
                        // Temporarily override the verifyDeviceProximity function
                        const originalVerify = window.iotexDeviceVerifier.verifyDeviceProximity;
                        window.iotexDeviceVerifier.verifyDeviceProximity = async function(deviceId, x, y, proofData) {
                            console.log(`🎯 Overriding coordinates from (${x}, ${y}) to (${forcedX}, ${forcedY})`);
                            return originalVerify.call(this, deviceId, forcedX, forcedY, proofData);
                        };
                        
                        // Call original handler
                        const result = await handler.call(this, data);
                        
                        // Restore original function
                        window.iotexDeviceVerifier.verifyDeviceProximity = originalVerify;
                        
                        return result;
                    }
                    
                    // No override needed, call original
                    return handler.call(this, data);
                };
                
                // Register wrapped handler
                return originalOn.call(this, event, wrappedHandler);
            }
            
            // For other events, use original handler
            return originalOn.call(this, event, handler);
        };
        
        console.log('🎯 wsManager.on method wrapped successfully');
    }
    
    console.log('Main coordinate override (fixed) initialized');
})();