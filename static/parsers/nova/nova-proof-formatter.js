// Nova Proof Formatter for IoTeX Device Verifier V2
// Converts proof data to match the Nova Decider interface

class NovaProofFormatter {
    constructor() {
        // The Nova Decider expects these 9 parameters:
        // 1. i_z0_zi: [3] - Initial and final state
        // 2. U_i_cmW_U_i_cmE: [4] - Commitments
        // 3. u_i_cmW: [2] - Small commitment
        // 4. cmT_r: [3] - T commitment and randomness
        // 5. pA: [2] - Groth16 proof point A
        // 6. pB: [2][2] - Groth16 proof point B
        // 7. pC: [2] - Groth16 proof point C
        // 8. challenge_W_challenge_E_kzg_evals: [4] - KZG challenges
        // 9. kzg_proof: [2][2] - KZG proof
    }
    
    // Format a device proximity proof for the Nova Decider
    formatDeviceProximityProof(deviceId, x, y, proofData) {
        // Extract device coordinates
        const deviceX = BigInt(x || 5050);
        const deviceY = BigInt(y || 5050);
        
        console.log('=== NOVA PROOF FORMATTER ===');
        console.log('Input:', {
            deviceId,
            x,
            y,
            hasProofData: !!proofData,
            proofDataKeys: proofData ? Object.keys(proofData) : [],
            proofDataLength: proofData?.proof_data?.length
        });
        
        // Check if we have actual proof data from zkEngine
        if (proofData && proofData.proof_data) {
            console.log('Found proof_data, length:', proofData.proof_data.length);
            console.log('Proof data first 100 chars:', proofData.proof_data.substring(0, 100));
            
            // Try the new calldata parser first (designed for zkEngine binary format)
            if (window.ZKEngineCalldataParser) {
                console.log('Trying ZKEngine Calldata Parser...');
                const calldataParser = new ZKEngineCalldataParser();
                const parsedComponents = calldataParser.parseZKEngineProof(proofData);
                
                if (parsedComponents) {
                    console.log('Successfully parsed with calldata parser');
                    const formatted = calldataParser.formatForIoTeXContract(parsedComponents, x, y);
                    if (formatted) {
                        console.log('Successfully formatted for IoTeX contract');
                        return formatted;
                    }
                }
            }
            
            // Try V3 parser next (handles zkEngine binary format better)
            if (window.NovaProofParserV3) {
                console.log('Trying Nova Proof Parser V3...');
                const parserV3 = new NovaProofParserV3();
                const parsedComponents = parserV3.parseZKEngineProof(proofData);
                
                if (parsedComponents) {
                    console.log('Successfully parsed with V3 parser');
                    const formatted = parserV3.formatForIoTeXContract(parsedComponents, x, y);
                    if (formatted) {
                        console.log('Successfully formatted for IoTeX contract');
                        return formatted;
                    }
                }
            }
            
            // Try enhanced parser V2 next
            if (window.NovaProofParserV2) {
                console.log('Trying Nova Proof Parser V2...');
                const parserV2 = new NovaProofParserV2();
                const parsedComponents = parserV2.parseZKEngineProof(proofData);
                
                if (parsedComponents) {
                    console.log('Successfully parsed with V2 parser');
                    const formatted = parserV2.formatForIoTeXContract(parsedComponents, x, y);
                    if (formatted) {
                        console.log('Successfully formatted for IoTeX contract');
                        return formatted;
                    }
                }
            }
            
            // Try zkEngine parser next (handles JSON-serialized proofs)
            if (window.ZKEngineNovaParser) {
                console.log('Trying ZKEngine Nova Parser...');
                const zkParser = new ZKEngineNovaParser();
                const zkComponents = zkParser.parseZKEngineProof(proofData);
                
                if (zkComponents) {
                    console.log('Successfully parsed with ZKEngine parser');
                    const formatted = zkParser.formatForIoTeXContract(zkComponents, x, y);
                    if (formatted) {
                        console.log('Successfully formatted for IoTeX contract');
                        return formatted;
                    }
                }
            }
            
            // Fallback to original parser
            console.log('Falling back to original Nova parser...');
            const parser = new (window.NovaProofParser || NovaProofParser)();
            
            // Parse the proof binary if available
            let parsedComponents = null;
            try {
                parsedComponents = parser.parseNovaBinary(proofData.proof_data);
                console.log('Parsed components:', parsedComponents ? 'SUCCESS' : 'FAILED');
            } catch (parseError) {
                console.error('Failed to parse Nova binary:', parseError);
            }
            
            // Parse public inputs if available
            let publicInputs = null;
            if (proofData.public_inputs) {
                publicInputs = parser.parsePublicInputs(proofData.public_inputs);
                console.log('Parsed public inputs:', publicInputs);
            }
            
            // Format for contract
            if (parsedComponents) {
                const formatted = parser.formatForContract(parsedComponents, publicInputs, deviceId, x, y);
                console.log('Formatted proof - using parsed components');
                return formatted;
            }
        }
        
        // Fallback: create placeholder format
        console.warn('No valid zkEngine proof data available, using placeholder format');
        console.warn('This will fail cryptographic verification!');
        
        // Calculate if within proximity (for demo purposes)
        const centerX = BigInt(5000);
        const centerY = BigInt(5000);
        const radius = BigInt(100);
        
        const dx = deviceX > centerX ? deviceX - centerX : centerX - deviceX;
        const dy = deviceY > centerY ? deviceY - centerY : centerY - deviceY;
        const distanceSquared = dx * dx + dy * dy;
        const isWithinRadius = distanceSquared <= (radius * radius);
        
        const formattedProof = {
            // Initial state (x, y) and final state (1 if within radius, 0 if not)
            i_z0_zi: [
                '0x' + deviceX.toString(16).padStart(64, '0'),
                '0x' + deviceY.toString(16).padStart(64, '0'),
                '0x' + (isWithinRadius ? '1' : '0').padStart(64, '0')
            ],
            
            // Placeholder commitments (would be real KZG commitments)
            U_i_cmW_U_i_cmE: [
                '0x' + this.generateDeterministicHex(deviceId + '_U1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_U2', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_U3', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_U4', 64)
            ],
            
            // Small commitment
            u_i_cmW: [
                '0x' + this.generateDeterministicHex(deviceId + '_u1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_u2', 64)
            ],
            
            // T commitment and randomness
            cmT_r: [
                '0x' + this.generateDeterministicHex(deviceId + '_T1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_T2', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_T3', 64)
            ],
            
            // Groth16 proof points (placeholder values)
            pA: [
                '0x' + this.generateDeterministicHex(deviceId + '_pA1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_pA2', 64)
            ],
            
            pB: [
                [
                    '0x' + this.generateDeterministicHex(deviceId + '_pB00', 64),
                    '0x' + this.generateDeterministicHex(deviceId + '_pB01', 64)
                ],
                [
                    '0x' + this.generateDeterministicHex(deviceId + '_pB10', 64),
                    '0x' + this.generateDeterministicHex(deviceId + '_pB11', 64)
                ]
            ],
            
            pC: [
                '0x' + this.generateDeterministicHex(deviceId + '_pC1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_pC2', 64)
            ],
            
            // KZG challenges and evaluations
            challenge_W_challenge_E_kzg_evals: [
                '0x' + this.generateDeterministicHex(deviceId + '_ch1', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_ch2', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_ch3', 64),
                '0x' + this.generateDeterministicHex(deviceId + '_ch4', 64)
            ],
            
            // KZG proof
            kzg_proof: [
                [
                    '0x' + this.generateDeterministicHex(deviceId + '_kzg00', 64),
                    '0x' + this.generateDeterministicHex(deviceId + '_kzg01', 64)
                ],
                [
                    '0x' + this.generateDeterministicHex(deviceId + '_kzg10', 64),
                    '0x' + this.generateDeterministicHex(deviceId + '_kzg11', 64)
                ]
            ]
        };
        
        return formattedProof;
    }
    
    // Generate deterministic hex string from seed (for demo purposes)
    generateDeterministicHex(seed, length) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Create a deterministic but valid-looking hex string
        const baseHex = Math.abs(hash).toString(16);
        const repeated = baseHex.repeat(Math.ceil(length / baseHex.length));
        return repeated.substring(0, length);
    }
    
    // Convert device ID to bytes32
    deviceIdToBytes32(deviceId) {
        // Hash the device ID to get a bytes32 value
        const encoder = new TextEncoder();
        const data = encoder.encode(deviceId);
        return window.crypto.subtle.digest('SHA-256', data)
            .then(hash => {
                const hashArray = new Uint8Array(hash);
                const hashHex = Array.from(hashArray)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                return '0x' + hashHex;
            });
    }
}

// Make it globally available
window.NovaProofFormatter = NovaProofFormatter;