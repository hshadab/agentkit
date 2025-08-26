// Backend Step Interceptor - Intercepts and fixes workflow steps from backend

(function() {
    console.log('🎯 Backend Step Interceptor Active');
    
    // Store command-to-coordinates mapping
    const commandCoordinates = new Map();
    
    // Extract coordinates from any message
    function extractCoordinates(text) {
        const patterns = [
            /location\s+(\d+),(\d+)/i,
            /at\s+(\d+),(\d+)/i,
            /coordinates?\s+(\d+),(\d+)/i,
            /\((\d+),(\d+)\)/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return {
                    x: parseInt(match[1]),
                    y: parseInt(match[2])
                };
            }
        }
        return null;
    }
    
    // Monitor all WebSocket messages
    if (window.wsManager) {
        // Store original emit to chain interceptors
        const originalEmit = window.wsManager.emit;
        
        window.wsManager.emit = function(event, data) {
            console.log(`🎯 WebSocket event: ${event}`);
            
            // Capture user messages to extract coordinates
            if (event === 'message' && data.content) {
                const coords = extractCoordinates(data.content);
                if (coords) {
                    console.log(`🎯 Found coordinates in user message: (${coords.x}, ${coords.y})`);
                    commandCoordinates.set('latest', coords);
                }
            }
            
            // Intercept workflow data
            if (event === 'workflow_started' || event === 'workflow_updated') {
                console.log('🎯 Intercepting workflow data');
                
                // Extract coordinates from workflow description
                if (data.description) {
                    const coords = extractCoordinates(data.description);
                    if (coords) {
                        console.log(`🎯 Found coordinates in workflow description: (${coords.x}, ${coords.y})`);
                        commandCoordinates.set(data.workflow_id || data.id, coords);
                    }
                }
                
                // Fix device proximity steps
                if (data.steps) {
                    const workflowCoords = commandCoordinates.get(data.workflow_id || data.id) || 
                                          commandCoordinates.get('latest');
                    
                    data.steps.forEach((step, index) => {
                        if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                            console.log(`🎯 Processing device proximity step ${index}`);
                            console.log('Original step:', JSON.stringify(step, null, 2));
                            
                            // Try to get coordinates from various sources
                            let x, y;
                            
                            // 1. From step itself
                            if (step.x && step.y) {
                                x = parseInt(step.x);
                                y = parseInt(step.y);
                                console.log(`🎯 Using coordinates from step: (${x}, ${y})`);
                            }
                            // 2. From location string in step
                            else if (step.location) {
                                const coords = extractCoordinates(step.location);
                                if (coords) {
                                    x = coords.x;
                                    y = coords.y;
                                    console.log(`🎯 Extracted from step location: (${x}, ${y})`);
                                }
                            }
                            // 3. From stored workflow coordinates
                            else if (workflowCoords) {
                                x = workflowCoords.x;
                                y = workflowCoords.y;
                                console.log(`🎯 Using stored workflow coordinates: (${x}, ${y})`);
                            }
                            // 4. Default
                            else {
                                x = 5050;
                                y = 5050;
                                console.warn('🎯 No coordinates found, using defaults: (5050, 5050)');
                            }
                            
                            // Update step with coordinates
                            step.x = x.toString();
                            step.y = y.toString();
                            step.location = `${x},${y}`;
                            
                            // Ensure parameters object exists and has coordinates
                            if (!step.parameters) {
                                step.parameters = {};
                            }
                            step.parameters.x = x;
                            step.parameters.y = y;
                            step.parameters.location = { x, y };
                            
                            // Ensure device_id is set
                            if (step.device_id) {
                                step.parameters.device_id = step.device_id;
                            }
                            
                            console.log('🎯 Fixed step:', JSON.stringify(step, null, 2));
                        }
                    });
                }
            }
            
            // Intercept proof generation messages
            if (event === 'generate_proof' && data.proof_type === 'device_proximity') {
                console.log('🎯 Intercepting proof generation');
                
                const coords = commandCoordinates.get('latest');
                if (coords && (!data.parameters || !data.parameters.x || !data.parameters.y)) {
                    console.log(`🎯 Applying stored coordinates: (${coords.x}, ${coords.y})`);
                    
                    if (!data.parameters) data.parameters = {};
                    data.parameters.x = coords.x;
                    data.parameters.y = coords.y;
                    data.parameters.location = { x: coords.x, y: coords.y };
                }
            }
            
            return originalEmit.call(this, event, data);
        };
        
        // Also intercept send for outgoing messages
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            // Capture user commands
            if (message && message.type === 'message' && message.content) {
                const coords = extractCoordinates(message.content);
                if (coords) {
                    console.log(`🎯 Storing coordinates from command: (${coords.x}, ${coords.y})`);
                    commandCoordinates.set('latest', coords);
                }
            }
            
            // Fix proof generation messages
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                const coords = commandCoordinates.get('latest');
                if (coords) {
                    console.log(`🎯 Fixing proof generation with coordinates: (${coords.x}, ${coords.y})`);
                    
                    if (!message.parameters) message.parameters = {};
                    message.parameters.x = coords.x;
                    message.parameters.y = coords.y;
                    message.parameters.location = { x: coords.x, y: coords.y };
                    
                    if (message.metadata && message.metadata.arguments) {
                        // Ensure arguments array has correct coordinates
                        if (message.metadata.arguments.length >= 3) {
                            message.metadata.arguments[1] = coords.x.toString();
                            message.metadata.arguments[2] = coords.y.toString();
                        }
                    }
                }
            }
            
            return originalSend.call(this, message);
        };
    }
    
    // Debug helper
    window.debugCoordinates = function() {
        console.log('🎯 Stored coordinates:', Array.from(commandCoordinates.entries()));
    };
    
    console.log('Backend step interceptor initialized');
    console.log('Use window.debugCoordinates() to see stored coordinates');
})();