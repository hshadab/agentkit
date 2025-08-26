// Force Coordinates Fix - Extracts coordinates from workflow description and forces them into steps

(function() {
    console.log('🔨 Force Coordinates Fix Active');
    
    // Store the last command to extract coordinates from it
    let lastCommand = '';
    
    // Monitor user input
    const originalSend = window.wsManager?.send;
    if (originalSend) {
        window.wsManager.send = function(message) {
            if (message && message.type === 'message' && message.content) {
                lastCommand = message.content;
                console.log('🔨 Captured user command:', lastCommand);
                
                // Extract coordinates from command
                const coordMatch = lastCommand.match(/location\s+(\d+),(\d+)/i) || 
                                  lastCommand.match(/at\s+(\d+),(\d+)/i);
                if (coordMatch) {
                    window.forcedCoordinates = {
                        x: parseInt(coordMatch[1]),
                        y: parseInt(coordMatch[2])
                    };
                    console.log('🔨 Extracted coordinates from command:', window.forcedCoordinates);
                }
            }
            return originalSend.call(this, message);
        };
    }
    
    // Force coordinates into workflow steps
    if (window.wsManager) {
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'workflow_started' && data) {
                console.log('🔨 Workflow started - checking for device proximity steps');
                
                // Extract coordinates from workflow description if not already done
                if (!window.forcedCoordinates && data.description) {
                    const match = data.description.match(/location\s+(\d+),(\d+)/i) || 
                                 data.description.match(/at\s+(\d+),(\d+)/i);
                    if (match) {
                        window.forcedCoordinates = {
                            x: parseInt(match[1]),
                            y: parseInt(match[2])
                        };
                        console.log('🔨 Extracted coordinates from workflow description:', window.forcedCoordinates);
                    }
                }
                
                // Force coordinates into device proximity steps
                if (data.steps && window.forcedCoordinates) {
                    data.steps.forEach((step, index) => {
                        if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                            console.log(`🔨 Forcing coordinates into step ${index}`);
                            console.log('Original step:', JSON.stringify(step, null, 2));
                            
                            // Force the coordinates
                            step.x = window.forcedCoordinates.x.toString();
                            step.y = window.forcedCoordinates.y.toString();
                            step.location = `${window.forcedCoordinates.x},${window.forcedCoordinates.y}`;
                            
                            if (!step.parameters) step.parameters = {};
                            step.parameters.x = window.forcedCoordinates.x;
                            step.parameters.y = window.forcedCoordinates.y;
                            step.parameters.location = {
                                x: window.forcedCoordinates.x,
                                y: window.forcedCoordinates.y
                            };
                            
                            console.log('Fixed step:', JSON.stringify(step, null, 2));
                        }
                    });
                }
            }
            
            return originalEmit.call(this, event, data);
        };
    }
    
    // Also force into proof generation
    const originalProofSend = window.wsManager?.send;
    if (originalProofSend) {
        window.wsManager.send = function(message) {
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                if (window.forcedCoordinates) {
                    console.log('🔨 Forcing coordinates into proof generation request');
                    
                    if (!message.parameters) message.parameters = {};
                    message.parameters.x = window.forcedCoordinates.x;
                    message.parameters.y = window.forcedCoordinates.y;
                    message.parameters.location = {
                        x: window.forcedCoordinates.x,
                        y: window.forcedCoordinates.y
                    };
                    
                    if (message.metadata) {
                        message.metadata.arguments = [
                            message.parameters.device_id || 'UNKNOWN',
                            window.forcedCoordinates.x.toString(),
                            window.forcedCoordinates.y.toString()
                        ];
                        console.log('🔨 Fixed metadata.arguments:', message.metadata.arguments);
                    }
                }
            }
            
            return originalProofSend.call(this, message);
        };
    }
    
    // Helper function to manually set coordinates
    window.setDeviceCoordinates = function(x, y) {
        window.forcedCoordinates = { x, y };
        console.log('🔨 Manually set coordinates:', window.forcedCoordinates);
    };
    
    console.log('Force coordinates fix initialized');
    console.log('Use window.setDeviceCoordinates(x, y) to manually set coordinates');
})();