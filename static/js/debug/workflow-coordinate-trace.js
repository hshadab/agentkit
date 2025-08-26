// Workflow Coordinate Trace - Traces coordinates through the entire workflow

(function() {
    console.log('🔍 Workflow Coordinate Trace Active');
    
    // Monitor workflow creation
    if (window.workflowManager) {
        const originalCreate = window.workflowManager.createWorkflowCard;
        if (originalCreate) {
            window.workflowManager.createWorkflowCard = function(workflowData) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📋 WORKFLOW CREATED');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Workflow ID:', workflowData.id);
                console.log('Description:', workflowData.description);
                
                // Find device proximity steps
                if (workflowData.steps) {
                    workflowData.steps.forEach((step, index) => {
                        if (step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                            console.log(`\nStep ${index}: Generate Device Proximity Proof`);
                            console.log('Step data:', JSON.stringify(step, null, 2));
                            
                            // Check for coordinates in various places
                            if (step.x && step.y) {
                                console.log(`✅ Found coordinates in step: x=${step.x}, y=${step.y}`);
                            } else if (step.location) {
                                console.log(`Found location: ${step.location}`);
                            } else if (step.parameters) {
                                console.log('Found parameters:', step.parameters);
                            } else {
                                console.log('❌ No coordinates found in step!');
                            }
                        }
                    });
                }
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                return originalCreate.call(this, workflowData);
            };
        }
    }
    
    // Monitor step execution
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            if (message && message.type === 'execute_step') {
                const step = message.step;
                if (step && step.action === 'generate_proof' && step.proof_type === 'device_proximity') {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🚀 EXECUTING DEVICE PROXIMITY STEP');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('Step being executed:', JSON.stringify(step, null, 2));
                    
                    // Check coordinate sources
                    console.log('\nCoordinate sources:');
                    console.log('1. step.x:', step.x);
                    console.log('2. step.y:', step.y);
                    console.log('3. step.location:', step.location);
                    console.log('4. step.parameters:', step.parameters);
                    
                    // Check if parameters are being properly set
                    if (!message.parameters) {
                        console.log('❌ No parameters object in message!');
                    } else {
                        console.log('✅ Parameters in message:', message.parameters);
                    }
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                }
            }
            
            return originalSend.call(this, message);
        };
    }
    
    // Monitor proof generation requests
    const originalSendProof = window.wsManager?.send;
    if (originalSendProof) {
        window.wsManager.send = function(message) {
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🔐 PROOF GENERATION REQUEST');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Full message:', JSON.stringify(message, null, 2));
                
                if (message.metadata && message.metadata.arguments) {
                    console.log('\nArguments being sent to zkEngine:');
                    message.metadata.arguments.forEach((arg, i) => {
                        console.log(`  [${i}]: ${arg}`);
                    });
                    
                    if (message.metadata.arguments.length >= 3) {
                        const [deviceId, x, y] = message.metadata.arguments;
                        console.log(`\nDevice: ${deviceId}`);
                        console.log(`Coordinates: (${x}, ${y})`);
                        
                        if (x === '5050' && y === '5050') {
                            console.warn('⚠️  Using default coordinates 5050,5050!');
                            console.warn('The actual coordinates from the command were not passed through!');
                        }
                    }
                }
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
            
            return originalSendProof.call(this, message);
        };
    }
    
    console.log('Workflow coordinate trace initialized');
})();