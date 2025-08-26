// Proof Analysis - Analyzes what's actually in the proof

(function() {
    console.log('🔬 Proof Analysis Active');
    
    // Monitor proof generation completion
    if (window.wsManager) {
        const originalEmit = window.wsManager.emit;
        window.wsManager.emit = function(event, data) {
            if (event === 'proof_complete' || event === 'proof_generated') {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🔬 PROOF ANALYSIS');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Proof ID:', data.proof_id || data.proofId);
                
                if (data.public_inputs) {
                    console.log('\nPublic Inputs:');
                    data.public_inputs.forEach((input, i) => {
                        console.log(`  [${i}]: ${input}`);
                    });
                    
                    if (data.proof_type === 'device_proximity' && data.public_inputs.length >= 4) {
                        console.log('\nDevice Proximity Structure:');
                        console.log('  Device ID Hash:', data.public_inputs[0]);
                        console.log('  Within Radius:', data.public_inputs[1] === '1' ? 'YES' : 'NO');
                        console.log('  X Coordinate:', data.public_inputs[2]);
                        console.log('  Y Coordinate:', data.public_inputs[3]);
                        
                        // Check coordinates
                        const proofX = parseInt(data.public_inputs[2]);
                        const proofY = parseInt(data.public_inputs[3]);
                        const expectedX = window.DEVICE_COORDINATES?.x || 5050;
                        const expectedY = window.DEVICE_COORDINATES?.y || 5050;
                        
                        if (proofX !== expectedX || proofY !== expectedY) {
                            console.error('❌ COORDINATE MISMATCH IN PROOF!');
                            console.error(`   Expected: (${expectedX}, ${expectedY})`);
                            console.error(`   In proof: (${proofX}, ${proofY})`);
                            console.error('   This means zkEngine received wrong coordinates!');
                        } else {
                            console.log('✅ Coordinates in proof match expected values');
                        }
                    }
                }
                
                if (data.metadata) {
                    console.log('\nMetadata:');
                    console.log('  Function:', data.metadata.function);
                    console.log('  Arguments:', data.metadata.arguments);
                    
                    if (data.metadata.arguments && data.metadata.arguments.length >= 3) {
                        console.log('\nzkEngine Arguments:');
                        console.log('  Device ID:', data.metadata.arguments[0]);
                        console.log('  X:', data.metadata.arguments[1]);
                        console.log('  Y:', data.metadata.arguments[2]);
                    }
                }
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
            
            return originalEmit.call(this, event, data);
        };
    }
    
    // Helper to analyze stored proofs
    window.analyzeProof = function(proofId) {
        console.log(`\n🔬 Analyzing proof ${proofId}...`);
        
        const proofData = window.proofManager?.proofs?.get(proofId);
        if (!proofData) {
            console.log('Proof not found in manager');
            return;
        }
        
        console.log('Proof data:', proofData);
        
        if (proofData.public_inputs) {
            console.log('\nPublic inputs:', proofData.public_inputs);
            
            if (proofData.public_inputs.length >= 4) {
                const x = proofData.public_inputs[2];
                const y = proofData.public_inputs[3];
                console.log(`Coordinates in proof: (${x}, ${y})`);
                
                // Calculate proximity
                const centerX = 5000;
                const centerY = 5000;
                const dx = parseInt(x) - centerX;
                const dy = parseInt(y) - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                console.log(`Distance from center: ${distance.toFixed(2)} units`);
                console.log(`Within 100-unit radius: ${distance <= 100 ? 'YES' : 'NO'}`);
                console.log(`Proof says within radius: ${proofData.public_inputs[1] === '1' ? 'YES' : 'NO'}`);
            }
        }
        
        if (proofData.metadata) {
            console.log('\nMetadata:', proofData.metadata);
            if (proofData.metadata.arguments) {
                console.log('zkEngine arguments:', proofData.metadata.arguments);
            }
        }
    };
    
    console.log('Proof analysis initialized');
    console.log('Use window.analyzeProof("proof_id") to analyze a specific proof');
})();