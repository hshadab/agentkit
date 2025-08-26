// Proof Verification Monitor - Detailed logging for debugging proof failures

(function() {
    console.log('🔍 Proof Verification Monitor Active');
    
    // Monitor Nova proof formatter
    if (window.NovaProofFormatter) {
        const original = window.NovaProofFormatter.prototype.formatDeviceProximityProof;
        window.NovaProofFormatter.prototype.formatDeviceProximityProof = function(deviceId, x, y, proofData) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔐 PROOF FORMATTING MONITOR');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Device ID: ${deviceId}`);
            console.log(`Requested coordinates: (${x}, ${y})`);
            console.log(`Proof data available: ${!!proofData}`);
            if (proofData) {
                console.log(`Proof data length: ${proofData.proof_data?.length || 0}`);
                if (proofData.proof_data) {
                    // Decode and check first few bytes
                    try {
                        const decoded = atob(proofData.proof_data.substring(0, 100));
                        const bytes = new Uint8Array(decoded.length);
                        for (let i = 0; i < decoded.length; i++) {
                            bytes[i] = decoded.charCodeAt(i);
                        }
                        console.log('First 32 bytes:', Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
                    } catch (e) {
                        console.error('Could not decode proof data:', e);
                    }
                }
            }
            
            const result = original.call(this, deviceId, x, y, proofData);
            
            if (result) {
                console.log('\n✅ Formatting Result:');
                console.log(`i_z0_zi[0] (x): ${result.i_z0_zi?.[0]}`);
                console.log(`i_z0_zi[1] (y): ${result.i_z0_zi?.[1]}`);
                console.log(`i_z0_zi[2] (proximity): ${result.i_z0_zi?.[2]}`);
                
                // Check if coordinates match request
                if (result.i_z0_zi) {
                    const proofX = BigInt(result.i_z0_zi[0]).toString();
                    const proofY = BigInt(result.i_z0_zi[1]).toString();
                    if (proofX !== x.toString() || proofY !== y.toString()) {
                        console.warn(`⚠️  Coordinate mismatch!`);
                        console.warn(`   Requested: (${x}, ${y})`);
                        console.warn(`   In proof:  (${proofX}, ${proofY})`);
                    }
                }
            } else {
                console.error('❌ Formatting failed - returned null');
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return result;
        };
    }
    
    // Monitor contract calls
    const originalLog = console.log;
    console.log = function(...args) {
        // Intercept proof verification logs
        const msg = args[0];
        if (typeof msg === 'string') {
            if (msg.includes('Groth16') || msg.includes('proof failed') || msg.includes('ErrExecutionReverted')) {
                console.error('🚨 PROOF VERIFICATION FAILURE DETECTED');
                console.error('Full error:', ...args);
                
                // Try to extract transaction hash
                const txMatch = msg.match(/0x[a-fA-F0-9]{64}/);
                if (txMatch) {
                    console.error(`Failed TX: https://testnet.iotexscan.io/tx/${txMatch[0]}`);
                }
            }
        }
        originalLog.apply(console, args);
    };
})();