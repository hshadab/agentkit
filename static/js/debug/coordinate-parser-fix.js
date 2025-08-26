// Coordinate Parser Fix - Ensures coordinates are properly parsed from workflow steps

(function() {
    console.log('🔧 Coordinate Parser Fix Active');
    
    // Helper function to parse coordinates from various formats
    function parseCoordinates(step) {
        let x = null, y = null;
        
        // Check if coordinates are already separated
        if (step.x && step.y) {
            x = parseInt(step.x) || null;
            y = parseInt(step.y) || null;
            console.log(`Using explicit x,y: (${x}, ${y})`);
            return { x, y };
        }
        
        // Check for location string in various places
        let locationStr = null;
        if (step.location) {
            locationStr = step.location;
        } else if (step.parameters?.location) {
            locationStr = step.parameters.location;
        }
        
        if (locationStr && typeof locationStr === 'string') {
            // Parse "x,y" format
            const parts = locationStr.split(',').map(s => s.trim());
            if (parts.length === 2) {
                x = parseInt(parts[0]) || null;
                y = parseInt(parts[1]) || null;
                console.log(`Parsed location "${locationStr}" to (${x}, ${y})`);
                return { x, y };
            }
        }
        
        // Check if location is an object with x,y
        if (locationStr && typeof locationStr === 'object') {
            x = parseInt(locationStr.x) || null;
            y = parseInt(locationStr.y) || null;
            console.log(`Using location object: (${x}, ${y})`);
            return { x, y };
        }
        
        console.warn('Could not parse coordinates from step:', step);
        return { x: null, y: null };
    }
    
    // Monitor workflow execution
    if (window.workflowManager) {
        const originalExecuteStep = window.workflowManager.executeWorkflowStep;
        if (originalExecuteStep) {
            window.workflowManager.executeWorkflowStep = async function(workflowId, step) {
                // Fix device proximity steps
                if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                    console.log('📍 Intercepting device proximity proof step');
                    console.log('Original step:', JSON.stringify(step, null, 2));
                    
                    // Parse coordinates
                    const coords = parseCoordinates(step);
                    
                    // Ensure parameters exist
                    if (!step.parameters) {
                        step.parameters = {};
                    }
                    
                    // Set coordinates in parameters
                    if (coords.x !== null) {
                        step.parameters.x = coords.x;
                        step.parameters.location = { x: coords.x, y: coords.y || 5050 };
                    }
                    if (coords.y !== null) {
                        step.parameters.y = coords.y;
                        if (step.parameters.location) {
                            step.parameters.location.y = coords.y;
                        }
                    }
                    
                    // Default to 5050,5050 if no coordinates found
                    if (!step.parameters.x) {
                        step.parameters.x = 5050;
                        console.log('Setting default x=5050');
                    }
                    if (!step.parameters.y) {
                        step.parameters.y = 5050;
                        console.log('Setting default y=5050');
                    }
                    
                    // Ensure location object exists
                    if (!step.parameters.location) {
                        step.parameters.location = {
                            x: step.parameters.x,
                            y: step.parameters.y
                        };
                    }
                    
                    console.log('Fixed step:', JSON.stringify(step, null, 2));
                }
                
                return originalExecuteStep.call(this, workflowId, step);
            };
        }
    }
    
    // Also monitor WebSocket messages
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            // Fix generate_proof messages for device_proximity
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                console.log('📍 Intercepting device proximity proof generation message');
                console.log('Original message:', JSON.stringify(message, null, 2));
                
                // Ensure parameters exist
                if (!message.parameters) {
                    message.parameters = {};
                }
                
                // If we have a location string, parse it
                if (message.parameters.location && typeof message.parameters.location === 'string') {
                    const parts = message.parameters.location.split(',').map(s => s.trim());
                    if (parts.length === 2) {
                        const x = parseInt(parts[0]) || 5050;
                        const y = parseInt(parts[1]) || 5050;
                        message.parameters.location = { x, y };
                        message.parameters.x = x;
                        message.parameters.y = y;
                        console.log(`Parsed location to object: x=${x}, y=${y}`);
                    }
                }
                
                // If location is an object, ensure x,y are also set as separate params
                if (message.parameters.location && typeof message.parameters.location === 'object') {
                    if (message.parameters.location.x && !message.parameters.x) {
                        message.parameters.x = message.parameters.location.x;
                    }
                    if (message.parameters.location.y && !message.parameters.y) {
                        message.parameters.y = message.parameters.location.y;
                    }
                }
                
                // Set defaults if missing
                if (!message.parameters.x) {
                    message.parameters.x = 5050;
                    console.log('Setting default x=5050');
                }
                if (!message.parameters.y) {
                    message.parameters.y = 5050;
                    console.log('Setting default y=5050');
                }
                
                // Ensure location object exists
                if (!message.parameters.location || typeof message.parameters.location !== 'object') {
                    message.parameters.location = {
                        x: message.parameters.x,
                        y: message.parameters.y
                    };
                }
                
                console.log('Fixed message:', JSON.stringify(message, null, 2));
            }
            
            return originalSend.call(this, message);
        };
    }
    
    console.log('Coordinate parser fix initialized');
})();