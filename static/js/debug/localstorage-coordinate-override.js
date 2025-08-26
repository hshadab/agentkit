// LocalStorage Coordinate Override - Uses localStorage to force specific coordinates

(function() {
    console.log('💾 LocalStorage Coordinate Override Active');
    
    // Check for forced coordinates in localStorage
    const forcedCoordsStr = localStorage.getItem('forceCoordinates');
    if (forcedCoordsStr) {
        try {
            const coords = JSON.parse(forcedCoordsStr);
            console.log('💾 Found forced coordinates in localStorage:', coords);
            window.forcedCoordinates = coords;
        } catch (e) {
            console.error('💾 Error parsing forced coordinates:', e);
        }
    }
    
    // Override proof generation to use forced coordinates
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                // Check localStorage again in case it was set after page load
                const forcedCoordsStr = localStorage.getItem('forceCoordinates');
                if (forcedCoordsStr) {
                    try {
                        const coords = JSON.parse(forcedCoordsStr);
                        console.log('💾 Applying forced coordinates from localStorage:', coords);
                        
                        if (!message.parameters) message.parameters = {};
                        message.parameters.x = coords.x;
                        message.parameters.y = coords.y;
                        message.parameters.location = { x: coords.x, y: coords.y };
                        
                        if (message.metadata && message.metadata.arguments) {
                            message.metadata.arguments = [
                                message.parameters.device_id || message.metadata.arguments[0] || 'UNKNOWN',
                                coords.x.toString(),
                                coords.y.toString()
                            ];
                            console.log('💾 Fixed metadata.arguments:', message.metadata.arguments);
                        }
                        
                        // Clear after use (optional - remove this line to keep using same coordinates)
                        // localStorage.removeItem('forceCoordinates');
                    } catch (e) {
                        console.error('💾 Error applying forced coordinates:', e);
                    }
                }
            }
            
            return originalSend.call(this, message);
        };
    }
    
    // Helper functions
    window.forceDeviceCoordinates = function(x, y) {
        const coords = { x, y };
        localStorage.setItem('forceCoordinates', JSON.stringify(coords));
        window.forcedCoordinates = coords;
        console.log('💾 Forced coordinates set:', coords);
        console.log('These coordinates will be used for the next device proximity proof');
    };
    
    window.clearForcedCoordinates = function() {
        localStorage.removeItem('forceCoordinates');
        delete window.forcedCoordinates;
        console.log('💾 Forced coordinates cleared');
    };
    
    window.checkForcedCoordinates = function() {
        const stored = localStorage.getItem('forceCoordinates');
        if (stored) {
            console.log('💾 Forced coordinates in localStorage:', JSON.parse(stored));
        } else {
            console.log('💾 No forced coordinates set');
        }
    };
    
    console.log('LocalStorage coordinate override initialized');
    console.log('Commands:');
    console.log('  window.forceDeviceCoordinates(x, y) - Force specific coordinates');
    console.log('  window.clearForcedCoordinates() - Clear forced coordinates');
    console.log('  window.checkForcedCoordinates() - Check current forced coordinates');
})();