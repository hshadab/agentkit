// Proof Generation Monitor - Logs proof generation requests

(function() {
    console.log('🔍 Proof Generation Monitor Active');
    
    // Monitor WebSocket messages for proof generation
    if (window.wsManager) {
        const originalSend = window.wsManager.send;
        window.wsManager.send = function(message) {
            if (message && message.type === 'generate_proof') {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎯 PROOF GENERATION REQUEST');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Proof type:', message.proof_type);
                console.log('Parameters:', message.parameters);
                if (message.parameters) {
                    console.log('  Device ID:', message.parameters.device_id);
                    console.log('  Location:', message.parameters.location);
                    if (message.parameters.location) {
                        console.log('    x:', message.parameters.location.x);
                        console.log('    y:', message.parameters.location.y);
                    }
                }
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
            return originalSend.call(this, message);
        };
        
        // Also monitor incoming proof responses
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'proof_generated' && data) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ PROOF GENERATION RESPONSE');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Proof ID:', data.proof_id);
                console.log('Success:', data.success);
                if (data.proof_data) {
                    console.log('Proof data length:', data.proof_data.length);
                    console.log('Has coordinates:', !!data.coordinates);
                    console.log('Has public_inputs:', !!data.public_inputs);
                    if (data.coordinates) {
                        console.log('Coordinates:', data.coordinates);
                    }
                    if (data.public_inputs) {
                        console.log('Public inputs:', data.public_inputs);
                    }
                }
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
            return originalEmit.call(this, event, data);
        };
    }
})();