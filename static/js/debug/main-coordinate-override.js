// Main Coordinate Override - Overrides coordinate extraction in main.js

(function() {
    console.log('🎯 Main Coordinate Override Active');
    
    // Wait for main.js to load
    const checkInterval = setInterval(() => {
        if (window.wsManager) {
            clearInterval(checkInterval);
            applyOverrides();
        }
    }, 100);
    
    function applyOverrides() {
        console.log('🎯 Applying coordinate overrides to IoTeX verification handler');
        
        // Override the iotex_verification_request handler
        const handlers = window.wsManager._handlers['iotex_verification_request'];
        if (handlers && handlers.length > 0) {
            const originalHandler = handlers[0];
            
            // Replace with our wrapped version
            handlers[0] = async function(data) {
                console.log('🎯 Intercepting IoTeX verification request');
                
                // Check for forced coordinates
                let forcedX = null, forcedY = null;
                
                // Check localStorage
                const forcedCoordsStr = localStorage.getItem('forceCoordinates');
                if (forcedCoordsStr) {
                    try {
                        const coords = JSON.parse(forcedCoordsStr);
                        forcedX = coords.x;
                        forcedY = coords.y;
                        console.log('🎯 Using forced coordinates from localStorage:', coords);
                    } catch (e) {}
                }
                
                // Check window.forcedCoordinates
                if (!forcedX && window.forcedCoordinates) {
                    forcedX = window.forcedCoordinates.x;
                    forcedY = window.forcedCoordinates.y;
                    console.log('🎯 Using forced coordinates from window:', window.forcedCoordinates);
                }
                
                // If we have forced coordinates, inject them
                if (forcedX && forcedY) {
                    // Temporarily override the verifyDeviceProximity function
                    const originalVerify = window.iotexDeviceVerifier.verifyDeviceProximity;
                    window.iotexDeviceVerifier.verifyDeviceProximity = async function(deviceId, x, y, proofData) {
                        console.log(`🎯 Overriding coordinates from (${x}, ${y}) to (${forcedX}, ${forcedY})`);
                        return originalVerify.call(this, deviceId, forcedX, forcedY, proofData);
                    };
                    
                    // Call original handler
                    const result = await originalHandler.call(this, data);
                    
                    // Restore original function
                    window.iotexDeviceVerifier.verifyDeviceProximity = originalVerify;
                    
                    return result;
                } else {
                    // No forced coordinates, call original
                    return originalHandler.call(this, data);
                }
            };
            
            console.log('🎯 IoTeX verification handler wrapped successfully');
        } else {
            console.warn('🎯 Could not find IoTeX verification handler to wrap');
        }
    }
    
    // Also override the proof formatter to show correct coordinates
    const checkFormatter = setInterval(() => {
        if (window.NovaProofFormatter && window.NovaProofFormatter.prototype.formatDeviceProximityProof) {
            clearInterval(checkFormatter);
            
            const originalFormat = window.NovaProofFormatter.prototype.formatDeviceProximityProof;
            window.NovaProofFormatter.prototype.formatDeviceProximityProof = function(deviceId, x, y, proofData) {
                // Check for forced coordinates
                const forcedCoordsStr = localStorage.getItem('forceCoordinates');
                if (forcedCoordsStr) {
                    try {
                        const coords = JSON.parse(forcedCoordsStr);
                        console.log(`🎯 Formatter: Using forced coordinates (${coords.x}, ${coords.y}) instead of (${x}, ${y})`);
                        x = coords.x;
                        y = coords.y;
                    } catch (e) {}
                } else if (window.forcedCoordinates) {
                    console.log(`🎯 Formatter: Using window forced coordinates (${window.forcedCoordinates.x}, ${window.forcedCoordinates.y}) instead of (${x}, ${y})`);
                    x = window.forcedCoordinates.x;
                    y = window.forcedCoordinates.y;
                }
                
                return originalFormat.call(this, deviceId, x, y, proofData);
            };
            
            console.log('🎯 Nova proof formatter wrapped successfully');
        }
    }, 100);
    
    console.log('Main coordinate override initialized');
})();