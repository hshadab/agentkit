// Public Inputs Fix - Corrects the indices for extracting coordinates from public inputs

(function() {
    console.log('🔧 Public Inputs Fix Active');
    
    // The public_inputs structure from Rust is:
    // [0]: device_id_hash
    // [1]: "1" if within radius, "0" if not  
    // [2]: x coordinate
    // [3]: y coordinate
    
    // Fix coordinate extraction wherever public_inputs are used
    if (window.wsManager) {
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'proof_generated' && data && data.public_inputs) {
                console.log('📍 Fixing public inputs indices');
                console.log('Original public_inputs:', data.public_inputs);
                
                if (data.proof_type === 'device_proximity' && data.public_inputs.length >= 4) {
                    // Log the correct mapping
                    console.log('Public inputs mapping:');
                    console.log('  [0] Device ID hash:', data.public_inputs[0]);
                    console.log('  [1] Within radius:', data.public_inputs[1] === '1' ? 'YES' : 'NO');
                    console.log('  [2] X coordinate:', data.public_inputs[2]);
                    console.log('  [3] Y coordinate:', data.public_inputs[3]);
                    
                    // Add coordinates to the data for easier access
                    data.coordinates = {
                        x: parseInt(data.public_inputs[2]) || 0,
                        y: parseInt(data.public_inputs[3]) || 0
                    };
                    data.withinRadius = data.public_inputs[1] === '1';
                }
            }
            
            return originalEmit.call(this, event, data);
        };
    }
    
    // Fix main.js coordinate extraction
    const originalHandleVerify = window.handleVerifyOnIoTeX;
    if (originalHandleVerify) {
        window.handleVerifyOnIoTeX = async function(step) {
            console.log('📍 Intercepting IoTeX verification');
            
            // Check if we need to fix coordinate extraction
            if (step.proof_id) {
                const proofData = window.proofManager?.proofs?.get(step.proof_id);
                if (proofData && proofData.public_inputs && proofData.public_inputs.length >= 4) {
                    // Ensure coordinates are properly set
                    if (!proofData.coordinates) {
                        proofData.coordinates = {
                            x: parseInt(proofData.public_inputs[2]) || 5050,
                            y: parseInt(proofData.public_inputs[3]) || 5050
                        };
                        console.log('Fixed coordinates from public_inputs:', proofData.coordinates);
                    }
                }
            }
            
            return originalHandleVerify.call(this, step);
        };
    }
    
    // Helper to check public inputs structure
    window.checkPublicInputs = function(proofId) {
        console.log(`\n🔍 Checking public inputs for proof ${proofId}...`);
        
        const proofData = window.proofManager?.proofs?.get(proofId);
        if (!proofData) {
            console.log('Proof not found');
            return;
        }
        
        if (proofData.public_inputs) {
            console.log('Public inputs:', proofData.public_inputs);
            
            if (proofData.proof_type === 'device_proximity' && proofData.public_inputs.length >= 4) {
                console.log('\nDevice Proximity Proof Structure:');
                console.log('  [0] Device ID hash:', proofData.public_inputs[0]);
                console.log('  [1] Within radius:', proofData.public_inputs[1] === '1' ? 'YES ✅' : 'NO ❌');
                console.log('  [2] X coordinate:', proofData.public_inputs[2]);
                console.log('  [3] Y coordinate:', proofData.public_inputs[3]);
                
                const x = parseInt(proofData.public_inputs[2]);
                const y = parseInt(proofData.public_inputs[3]);
                
                // Calculate distance
                const centerX = 5000;
                const centerY = 5000;
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                console.log(`\nDistance from center (${centerX}, ${centerY}): ${distance.toFixed(2)} units`);
                console.log(`Required radius: 100 units`);
                console.log(distance <= 100 ? '✅ Within proximity!' : '❌ Outside proximity!');
                
                if (proofData.public_inputs[1] === '1' && distance > 100) {
                    console.warn('⚠️  Proof says within radius but distance calculation disagrees!');
                } else if (proofData.public_inputs[1] === '0' && distance <= 100) {
                    console.warn('⚠️  Proof says outside radius but distance calculation disagrees!');
                }
            }
        } else {
            console.log('No public inputs found');
        }
    };
    
    console.log('Public inputs fix initialized');
    console.log('Use window.checkPublicInputs("proof_id") to analyze public inputs');
})();