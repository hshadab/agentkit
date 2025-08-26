// Coordinate Fix - Ensures x,y coordinates are properly passed for device proximity proofs

(function() {
    console.log('🔧 Coordinate Fix Active');
    
    // Monitor WebSocket messages
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            // Fix generate_proof messages for device_proximity
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                console.log('📍 Intercepting device proximity proof generation');
                console.log('Original message:', JSON.stringify(message, null, 2));
                
                // Ensure parameters exist
                if (!message.parameters) {
                    message.parameters = {};
                }
                
                // If location is provided as "x,y" format, parse it
                if (message.parameters.location && typeof message.parameters.location === 'string') {
                    const parts = message.parameters.location.split(',').map(s => s.trim());
                    if (parts.length === 2) {
                        message.parameters.x = parseInt(parts[0]) || 5050;
                        message.parameters.y = parseInt(parts[1]) || 5050;
                        console.log(`Parsed location "${message.parameters.location}" to x=${message.parameters.x}, y=${message.parameters.y}`);
                    }
                }
                
                // Set default coordinates if not provided
                if (!message.parameters.x) {
                    message.parameters.x = 5050;
                    console.log('Setting default x=5050');
                }
                if (!message.parameters.y) {
                    message.parameters.y = 5050;
                    console.log('Setting default y=5050');
                }
                
                // Ensure coordinates are numbers
                message.parameters.x = parseInt(message.parameters.x) || 5050;
                message.parameters.y = parseInt(message.parameters.y) || 5050;
                
                console.log('Fixed message:', JSON.stringify(message, null, 2));
            }
            
            return originalSend.call(this, message);
        };
    }
    
    // Also fix any workflow steps that have location parameters
    if (window.workflowManager) {
        const originalCreateStep = window.workflowManager.createWorkflowStepElement;
        if (originalCreateStep) {
            window.workflowManager.createWorkflowStepElement = function(step, index) {
                // Fix device proximity steps
                if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                    // Check if step has location but not x,y
                    if (step.location && (!step.x || !step.y)) {
                        const parts = step.location.split(',').map(s => s.trim());
                        if (parts.length === 2) {
                            step.x = parseInt(parts[0]) || 5050;
                            step.y = parseInt(parts[1]) || 5050;
                            console.log(`Fixed step coordinates: x=${step.x}, y=${step.y}`);
                        }
                    }
                }
                return originalCreateStep.call(this, step, index);
            };
        }
    }
})();