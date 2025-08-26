// Workflow Step Fix - Ensures device proximity steps have proper coordinates

(function() {
    console.log('🔧 Workflow Step Fix Active');
    
    // Monitor workflow messages from backend
    if (window.wsManager) {
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'workflow_started' && data.steps) {
                console.log('🔧 Checking workflow steps for coordinates');
                
                // Look for device proximity steps
                data.steps.forEach((step, index) => {
                    if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                        console.log(`Step ${index}: Device proximity proof`);
                        console.log('Original step:', JSON.stringify(step, null, 2));
                        
                        // Create parameters if missing
                        if (!step.parameters) {
                            step.parameters = {};
                        }
                        
                        // Check if coordinates are in the step
                        if (step.x && step.y) {
                            console.log(`Found coordinates in step: x=${step.x}, y=${step.y}`);
                            step.parameters.x = parseInt(step.x) || 5050;
                            step.parameters.y = parseInt(step.y) || 5050;
                            step.parameters.location = {
                                x: step.parameters.x,
                                y: step.parameters.y
                            };
                        } else if (step.location && typeof step.location === 'string') {
                            // Parse location string
                            const parts = step.location.split(',').map(s => s.trim());
                            if (parts.length === 2) {
                                const x = parseInt(parts[0]) || 5050;
                                const y = parseInt(parts[1]) || 5050;
                                console.log(`Parsed location "${step.location}" to x=${x}, y=${y}`);
                                step.parameters.x = x;
                                step.parameters.y = y;
                                step.parameters.location = { x, y };
                            }
                        } else {
                            console.warn('⚠️  No coordinates found in step - using defaults');
                            step.parameters.x = 5050;
                            step.parameters.y = 5050;
                            step.parameters.location = { x: 5050, y: 5050 };
                        }
                        
                        // Ensure device_id is in parameters
                        if (step.device_id && !step.parameters.device_id) {
                            step.parameters.device_id = step.device_id;
                        }
                        
                        console.log('Fixed step parameters:', step.parameters);
                    }
                });
            }
            
            return originalEmit.call(this, event, data);
        };
    }
    
    // Also fix step execution
    const originalExecuteStep = window.executeWorkflowStep;
    if (originalExecuteStep) {
        window.executeWorkflowStep = async function(step) {
            if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                console.log('🔧 Fixing device proximity step before execution');
                
                // Ensure parameters exist
                if (!step.parameters) {
                    step.parameters = {};
                }
                
                // Copy coordinates from step to parameters if needed
                if (step.x && !step.parameters.x) {
                    step.parameters.x = parseInt(step.x) || 5050;
                }
                if (step.y && !step.parameters.y) {
                    step.parameters.y = parseInt(step.y) || 5050;
                }
                
                // Ensure location object
                if (!step.parameters.location && step.parameters.x && step.parameters.y) {
                    step.parameters.location = {
                        x: step.parameters.x,
                        y: step.parameters.y
                    };
                }
                
                // Copy device_id
                if (step.device_id && !step.parameters.device_id) {
                    step.parameters.device_id = step.device_id;
                }
                
                console.log('Step parameters before execution:', step.parameters);
            }
            
            return originalExecuteStep.call(this, step);
        };
    }
    
    console.log('Workflow step fix initialized');
})();