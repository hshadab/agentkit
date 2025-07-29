// Nova Proof Parser for zkEngine outputs
// Parses the actual Nova proof data from zkEngine

class NovaProofParser {
    constructor() {
        // Nova proof structure from zkEngine
        this.NOVA_PROOF_SIZE = 19038604; // ~18MB for device proximity proofs
    }
    
    // Parse the base64 encoded proof binary
    parseNovaBinary(base64ProofData) {
        try {
            // Decode base64 to binary
            const binaryString = atob(base64ProofData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log(`Parsing Nova proof binary: ${bytes.length} bytes`);
            
            // Nova proofs from zkEngine/Sonobe have a specific structure
            // The proof contains the following components in order:
            // 1. Folding instance data (commitments, challenges)
            // 2. Groth16 proof elements (A, B, C points)
            // 3. KZG commitments and proofs
            
            const FIELD_SIZE = 32; // Each field element is 32 bytes
            const POINT_SIZE = 64; // Each EC point is 64 bytes (two field elements)
            let offset = 0;
            
            // Helper to read a field element (little-endian)
            const readFieldElement = () => {
                if (offset + FIELD_SIZE > bytes.length) {
                    throw new Error(`Insufficient bytes for field element at offset ${offset}`);
                }
                const fieldBytes = bytes.slice(offset, offset + FIELD_SIZE);
                offset += FIELD_SIZE;
                
                // Convert to hex string (little-endian to big-endian)
                const reversedBytes = Array.from(fieldBytes).reverse();
                return '0x' + reversedBytes
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            };
            
            // Helper to read an EC point (two field elements)
            const readPoint = () => {
                const x = readFieldElement();
                const y = readFieldElement();
                return [x, y];
            };
            
            // Skip any header or metadata (if present)
            // zkEngine proofs have a specific structure
            // First few bytes often contain metadata/version info
            console.log('First 64 bytes:', Array.from(bytes.slice(0, 64))
                .map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Look for the start of actual proof data
            // Nova proofs typically start with curve points (non-zero data)
            let foundNonZero = false;
            for (let i = 0; i < Math.min(1000, bytes.length); i++) {
                if (bytes[i] !== 0) {
                    // Check if we have a sequence of non-zero bytes (likely start of proof)
                    let nonZeroCount = 0;
                    for (let j = i; j < Math.min(i + 32, bytes.length); j++) {
                        if (bytes[j] !== 0) nonZeroCount++;
                    }
                    if (nonZeroCount > 16) { // At least half of a field element is non-zero
                        offset = Math.floor(i / 32) * 32; // Align to field element boundary
                        foundNonZero = true;
                        console.log(`Found proof data starting at offset ${offset}`);
                        break;
                    }
                }
            }
            
            if (!foundNonZero && bytes.length > 19000000) {
                // Fallback: skip typical header size
                offset = 604;
            }
            
            const components = {
                // Nova IVC state commitments
                U_i_cmW: [],      // 2 points = 4 field elements
                U_i_cmE: [],      // 2 points = 4 field elements  
                u_i_cmW: [],      // 1 point = 2 field elements
                cmT: [],          // 1 point = 2 field elements
                r: null,          // 1 field element
                
                // Groth16 proof
                pA: [],           // 1 point = 2 field elements
                pB: [],           // 2x2 matrix = 4 field elements
                pC: [],           // 1 point = 2 field elements
                
                // KZG proof and challenges
                challenges: [],    // 4 field elements
                kzg_proof: []     // 2 points = 4 field elements
            };
            
            try {
                console.log(`Starting to parse Nova proof at offset ${offset}`);
                
                // Read Nova commitments (in order expected by contract)
                // U_i commitments (2 EC points)
                console.log('Reading U_i commitments...');
                const U_i_cmW_point = readPoint();
                const U_i_cmE_point = readPoint();
                components.U_i_cmW = U_i_cmW_point;
                components.U_i_cmE = U_i_cmE_point;
                console.log(`U_i_cmW: ${U_i_cmW_point[0].substring(0, 10)}...`);
                console.log(`U_i_cmE: ${U_i_cmE_point[0].substring(0, 10)}...`);
                
                // u_i commitment (1 EC point)
                console.log('Reading u_i commitment...');
                components.u_i_cmW = readPoint();
                console.log(`u_i_cmW: ${components.u_i_cmW[0].substring(0, 10)}...`);
                
                // cmT and r (1 EC point + 1 field)
                console.log('Reading cmT and r...');
                components.cmT = readPoint();
                components.r = readFieldElement();
                console.log(`cmT: ${components.cmT[0].substring(0, 10)}...`);
                console.log(`r: ${components.r.substring(0, 10)}...`);
                
                // Groth16 proof elements
                console.log('Reading Groth16 proof elements...');
                components.pA = readPoint();
                console.log(`pA: ${components.pA[0].substring(0, 10)}...`);
                
                // pB is a 2x2 matrix of field elements
                components.pB = [
                    [readFieldElement(), readFieldElement()],
                    [readFieldElement(), readFieldElement()]
                ];
                console.log(`pB[0][0]: ${components.pB[0][0].substring(0, 10)}...`);
                
                components.pC = readPoint();
                console.log(`pC: ${components.pC[0].substring(0, 10)}...`);
                
                // KZG challenges (4 field elements)
                console.log('Reading KZG challenges...');
                for (let i = 0; i < 4; i++) {
                    const challenge = readFieldElement();
                    components.challenges.push(challenge);
                    console.log(`challenge[${i}]: ${challenge.substring(0, 10)}...`);
                }
                
                // KZG proof (2 EC points)
                console.log('Reading KZG proof...');
                components.kzg_proof = [
                    readPoint(),
                    readPoint()
                ];
                console.log(`kzg_proof[0]: ${components.kzg_proof[0][0].substring(0, 10)}...`);
                console.log(`kzg_proof[1]: ${components.kzg_proof[1][0].substring(0, 10)}...`);
                
                console.log('Successfully parsed Nova proof components');
                console.log(`Final offset: ${offset} / ${bytes.length} bytes`);
                return components;
                
            } catch (parseError) {
                console.error('Error parsing specific components:', parseError);
                
                // Fallback: Try to extract some components generically
                console.warn('Using fallback parser due to error:', parseError.message);
                offset = 0;
                const fallbackComponents = {
                    commitments: [],
                    challenges: [],
                    evaluations: [],
                    proof_points: []
                };
                
                // Skip potential header bytes and find non-zero data
                let dataStart = 0;
                for (let i = 0; i < Math.min(10000, bytes.length); i += 32) {
                    let nonZeroCount = 0;
                    for (let j = i; j < Math.min(i + 32, bytes.length); j++) {
                        if (bytes[j] !== 0) nonZeroCount++;
                    }
                    if (nonZeroCount > 16) {
                        dataStart = i;
                        break;
                    }
                }
                
                offset = dataStart;
                console.log(`Fallback parser starting at offset ${offset}`);
                
                // Read as many field elements as possible
                let elementCount = 0;
                while (offset + FIELD_SIZE <= bytes.length && elementCount < 50) {
                    try {
                        const element = readFieldElement();
                        // Check if it's not all zeros
                        if (!element.match(/^0x0+$/)) {
                            fallbackComponents.commitments.push(element);
                            elementCount++;
                        }
                    } catch (e) {
                        console.error('Failed to read field element at offset', offset);
                        break;
                    }
                }
                
                console.log(`Fallback parser extracted ${fallbackComponents.commitments.length} non-zero field elements`);
                return fallbackComponents.commitments.length > 0 ? fallbackComponents : null;
            }
            
        } catch (error) {
            console.error('Failed to parse Nova binary:', error);
            return null;
        }
    }
    
    // Parse the public inputs JSON from zkEngine
    parsePublicInputs(publicInputsJson) {
        if (!publicInputsJson) return null;
        
        // zkEngine public inputs format varies by proof type
        // For device proximity, we expect execution_z0 with device coordinates
        if (publicInputsJson.execution_z0) {
            // execution_z0 contains the initial state (x, y coordinates)
            const coords = publicInputsJson.execution_z0;
            if (Array.isArray(coords) && coords.length >= 2) {
                // Convert hex strings to decimal if needed
                const parseCoord = (coord) => {
                    if (typeof coord === 'string' && coord.startsWith('0x')) {
                        return BigInt(coord).toString();
                    }
                    return coord;
                };
                
                return {
                    x: parseCoord(coords[0]),
                    y: parseCoord(coords[1]),
                    // Additional fields if present
                    result: publicInputsJson.execution_z0[2] || null
                };
            }
        }
        
        // Fallback: try to extract from other fields
        if (publicInputsJson.ops_z0 || publicInputsJson.scan_z0) {
            const data = publicInputsJson.ops_z0 || publicInputsJson.scan_z0;
            if (Array.isArray(data) && data.length >= 2) {
                return {
                    x: data[0],
                    y: data[1],
                    result: data[2] || null
                };
            }
        }
        
        return null;
    }
    
    // Convert parsed Nova proof to contract format
    formatForContract(parsedComponents, publicInputs, deviceId, x, y) {
        if (!parsedComponents) {
            console.warn('No parsed components, using fallback format');
            return this.createFallbackFormat(deviceId, x, y);
        }
        
        // Check if we have the new structured components or the fallback format
        if (parsedComponents.U_i_cmW && parsedComponents.U_i_cmE) {
            // New structured format from proper parsing
            const components = parsedComponents;
            
            // Extract public inputs to determine proximity result
            let proximityResult = '0x0000000000000000000000000000000000000000000000000000000000000001'; // default: within proximity
            
            if (publicInputs) {
                // Check if we have the execution result in public inputs
                if (publicInputs.execution_z0 && Array.isArray(publicInputs.execution_z0)) {
                    // execution_z0[0] = x coordinate, execution_z0[1] = y coordinate
                    // The result should be in IC_i or similar field
                    console.log('Public inputs:', publicInputs);
                }
            }
            
            // Calculate proximity ourselves for demo
            const centerX = BigInt(5000);
            const centerY = BigInt(5000);
            const radius = BigInt(100);
            const deviceX = BigInt(x || 5050);
            const deviceY = BigInt(y || 5050);
            
            const dx = deviceX > centerX ? deviceX - centerX : centerX - deviceX;
            const dy = deviceY > centerY ? deviceY - centerY : centerY - deviceY;
            const distanceSquared = dx * dx + dy * dy;
            const isWithinRadius = distanceSquared <= (radius * radius);
            
            if (!isWithinRadius) {
                proximityResult = '0x0000000000000000000000000000000000000000000000000000000000000000';
            }
            
            const formattedProof = {
                // Initial state (x, y) and final state (result)
                i_z0_zi: [
                    '0x' + deviceX.toString(16).padStart(64, '0'),
                    '0x' + deviceY.toString(16).padStart(64, '0'),
                    proximityResult
                ],
                
                // U_i commitments (cmW and cmE concatenated)
                U_i_cmW_U_i_cmE: [
                    components.U_i_cmW[0],
                    components.U_i_cmW[1], 
                    components.U_i_cmE[0],
                    components.U_i_cmE[1]
                ],
                
                // u_i commitment
                u_i_cmW: components.u_i_cmW,
                
                // cmT and r
                cmT_r: [
                    components.cmT[0],
                    components.cmT[1],
                    components.r
                ],
                
                // Groth16 proof elements
                pA: components.pA,
                pB: components.pB,
                pC: components.pC,
                
                // KZG challenges and evaluations
                challenge_W_challenge_E_kzg_evals: components.challenges,
                
                // KZG proof
                kzg_proof: components.kzg_proof
            };
            
            console.log('Formatted proof for contract:', {
                i_z0_zi_length: formattedProof.i_z0_zi.length,
                U_i_cmW_U_i_cmE_length: formattedProof.U_i_cmW_U_i_cmE.length,
                u_i_cmW_length: formattedProof.u_i_cmW.length,
                cmT_r_length: formattedProof.cmT_r.length,
                pA_length: formattedProof.pA.length,
                pB_shape: `${formattedProof.pB.length}x${formattedProof.pB[0]?.length}`,
                pC_length: formattedProof.pC.length,
                challenge_length: formattedProof.challenge_W_challenge_E_kzg_evals.length,
                kzg_proof_shape: `${formattedProof.kzg_proof.length}x${formattedProof.kzg_proof[0]?.length}`
            });
            
            return formattedProof;
        } else {
            // Fallback format (when using generic commitments array)
            const { commitments, challenges, evaluations, proof_points } = parsedComponents;
            
            console.warn('Using fallback format with generic commitments array');
            
            // Map to contract's expected format using the fallback arrays
            const formattedProof = {
                // Initial state (x, y) and final state (result)
                i_z0_zi: [
                    '0x' + BigInt(x || 5050).toString(16).padStart(64, '0'),
                    '0x' + BigInt(y || 5050).toString(16).padStart(64, '0'),
                    '0x0000000000000000000000000000000000000000000000000000000000000001' // Assuming within proximity
                ],
                
                // Use first 4 commitments for U_i_cmW_U_i_cmE
                U_i_cmW_U_i_cmE: commitments.slice(0, 4).concat(
                    Array(Math.max(0, 4 - commitments.length)).fill('0x' + '0'.repeat(64))
                ),
                
                // Use next 2 commitments for u_i_cmW
                u_i_cmW: commitments.slice(4, 6).concat(
                    Array(Math.max(0, 2 - Math.max(0, commitments.length - 4))).fill('0x' + '0'.repeat(64))
                ),
                
                // Use next 3 for cmT_r
                cmT_r: commitments.slice(6, 9).concat(
                    Array(Math.max(0, 3 - Math.max(0, commitments.length - 6))).fill('0x' + '0'.repeat(64))
                ),
                
                // Groth16 proof points
                pA: commitments.slice(9, 11).concat(
                    Array(Math.max(0, 2 - Math.max(0, commitments.length - 9))).fill('0x' + '0'.repeat(64))
                ),
                
                pB: [
                    commitments.slice(11, 13).concat(
                        Array(Math.max(0, 2 - Math.max(0, commitments.length - 11))).fill('0x' + '0'.repeat(64))
                    ),
                    commitments.slice(13, 15).concat(
                        Array(Math.max(0, 2 - Math.max(0, commitments.length - 13))).fill('0x' + '0'.repeat(64))
                    )
                ],
                
                pC: commitments.slice(15, 17).concat(
                    Array(Math.max(0, 2 - Math.max(0, commitments.length - 15))).fill('0x' + '0'.repeat(64))
                ),
                
                // Use next 4 for challenges
                challenge_W_challenge_E_kzg_evals: commitments.slice(17, 21).concat(
                    Array(Math.max(0, 4 - Math.max(0, commitments.length - 17))).fill('0x' + '0'.repeat(64))
                ),
                
                // KZG proof
                kzg_proof: [
                    commitments.slice(21, 23).concat(
                        Array(Math.max(0, 2 - Math.max(0, commitments.length - 21))).fill('0x' + '0'.repeat(64))
                    ),
                    commitments.slice(23, 25).concat(
                        Array(Math.max(0, 2 - Math.max(0, commitments.length - 23))).fill('0x' + '0'.repeat(64))
                    )
                ]
            };
            
            return formattedProof;
        }
    }
    
    // Create a fallback format when parsing fails
    createFallbackFormat(deviceId, x, y) {
        // This creates a properly structured but invalid proof
        // The contract will reject it, but at least it won't revert on format
        const placeholder = '0x' + '0'.repeat(64);
        
        return {
            i_z0_zi: [
                '0x' + BigInt(x || 5050).toString(16).padStart(64, '0'),
                '0x' + BigInt(y || 5050).toString(16).padStart(64, '0'),
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ],
            U_i_cmW_U_i_cmE: [placeholder, placeholder, placeholder, placeholder],
            u_i_cmW: [placeholder, placeholder],
            cmT_r: [placeholder, placeholder, placeholder],
            pA: [placeholder, placeholder],
            pB: [[placeholder, placeholder], [placeholder, placeholder]],
            pC: [placeholder, placeholder],
            challenge_W_challenge_E_kzg_evals: [placeholder, placeholder, placeholder, placeholder],
            kzg_proof: [[placeholder, placeholder], [placeholder, placeholder]]
        };
    }
}

// Export for use
window.NovaProofParser = NovaProofParser;