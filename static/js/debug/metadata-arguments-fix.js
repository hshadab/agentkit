// Metadata Arguments Fix - Ensures device proximity proofs have proper x,y arguments

(function() {
    console.log('🔧 Metadata Arguments Fix Active');
    
    // Monitor WebSocket messages
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            // Fix generate_proof messages for device_proximity
            if (message && message.type === 'generate_proof' && message.proof_type === 'device_proximity') {
                console.log('📍 Fixing device proximity metadata');
                console.log('Original message:', JSON.stringify(message, null, 2));
                
                // Ensure we have proper metadata
                if (!message.metadata) {
                    message.metadata = {
                        function: 'prove_device_proximity',
                        arguments: [],
                        step_size: 10,
                        explanation: 'Proving device is within proximity zone'
                    };
                }
                
                // Extract parameters
                const deviceId = message.parameters?.device_id || 'DEV_UNKNOWN';
                let x = 5050, y = 5050;
                
                // Try to get x,y from various sources
                if (message.parameters) {
                    // Direct x,y parameters
                    if (message.parameters.x !== undefined) {
                        x = parseInt(message.parameters.x) || 5050;
                    }
                    if (message.parameters.y !== undefined) {
                        y = parseInt(message.parameters.y) || 5050;
                    }
                    
                    // Location object
                    if (message.parameters.location) {
                        if (typeof message.parameters.location === 'object') {
                            if (message.parameters.location.x !== undefined) {
                                x = parseInt(message.parameters.location.x) || 5050;
                            }
                            if (message.parameters.location.y !== undefined) {
                                y = parseInt(message.parameters.location.y) || 5050;
                            }
                        } else if (typeof message.parameters.location === 'string') {
                            // Parse "x,y" format
                            const parts = message.parameters.location.split(',').map(s => s.trim());
                            if (parts.length === 2) {
                                x = parseInt(parts[0]) || 5050;
                                y = parseInt(parts[1]) || 5050;
                            }
                        }
                    }
                }
                
                // Set the arguments array to [device_id, x, y]
                message.metadata.arguments = [
                    deviceId,
                    x.toString(),
                    y.toString()
                ];
                
                console.log('Fixed metadata.arguments:', message.metadata.arguments);
                console.log('Fixed message:', JSON.stringify(message, null, 2));
            }
            
            return originalSend.call(this, message);
        };
    }
    
    // Also monitor proof generation responses to verify arguments were used
    if (window.wsManager) {
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'proof_status' && data) {
                if (data.metadata?.function === 'prove_device_proximity') {
                    console.log('Device proximity proof status:', {
                        proof_id: data.proof_id,
                        status: data.status,
                        arguments: data.metadata.arguments
                    });
                    
                    // Verify arguments are correct
                    if (data.metadata.arguments && data.metadata.arguments.length >= 3) {
                        const [device_id, x, y] = data.metadata.arguments;
                        console.log(`Device ${device_id} at (${x}, ${y})`);
                    } else {
                        console.error('⚠️ Missing or incomplete arguments in proof metadata!');
                    }
                }
            }
            
            return originalEmit.call(this, event, data);
        };
    }
    
    console.log('Metadata arguments fix initialized');
})();