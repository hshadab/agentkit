// ZKEngine Calldata Parser for IoTeX Device Verifier
// Parses zkEngine binary proof output and formats it for IoTeX contract

class ZKEngineCalldataParser {
    constructor() {
        this.debugLog = window.debugLog || console.log;
    }
    
    // Parse zkEngine proof and convert to calldata format
    parseZKEngineProof(proofData) {
        console.log('=== ZKENGINE CALLDATA PARSER ===');
        console.log('Proof data type:', typeof proofData);
        console.log('Proof data keys:', proofData ? Object.keys(proofData) : 'null');
        
        if (!proofData || !proofData.proof_data) {
            console.error('No proof_data found in proofData');
            return null;
        }
        
        // The proof_data from zkEngine is base64 encoded binary
        const proofBase64 = proofData.proof_data;
        console.log('Proof base64 length:', proofBase64.length);
        
        try {
            // Decode base64 to binary
            const binaryString = atob(proofBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('Decoded binary length:', bytes.length);
            
            // Parse the binary format based on zkEngine's output structure
            // The proof.bin contains a bincode-serialized CompressedSNARK
            let offset = 0;
            
            // Helper to read bytes in little-endian format (bincode uses LE)
            const readU64LE = () => {
                if (offset + 8 > bytes.length) {
                    throw new Error(`Not enough bytes for u64 at offset ${offset}`);
                }
                let value = 0n;
                for (let i = 0; i < 8; i++) {
                    value |= BigInt(bytes[offset + i]) << BigInt(i * 8);
                }
                offset += 8;
                return value;
            };
            
            // Helper to read 32 bytes as field element (little-endian)
            const readFieldElement = () => {
                if (offset + 32 > bytes.length) {
                    throw new Error(`Not enough bytes at offset ${offset}`);
                }
                const slice = bytes.slice(offset, offset + 32);
                offset += 32;
                
                // Convert LE bytes to BigInt
                let value = 0n;
                for (let i = 0; i < 32; i++) {
                    value |= BigInt(slice[i]) << BigInt(i * 8);
                }
                return value.toString(10); // Return as decimal string
            };
            
            // Helper to read a compressed point (33 bytes)
            const readCompressedPoint = () => {
                if (offset + 33 > bytes.length) {
                    throw new Error(`Not enough bytes for compressed point at offset ${offset}`);
                }
                const isOdd = bytes[offset] === 1;
                offset += 1;
                const x = readFieldElement();
                // For contract, we need both x and y coordinates
                // This is a placeholder - actual decompression would need the curve
                const y = isOdd ? "1" : "0"; 
                return [x, y];
            };
            
            // Parse based on CompressedSNARK structure from Arecibo
            // The format matches prepare_calldata from the Rust code
            
            try {
                // Try to parse as a serialized proof
                // The proof might have different structures, so we'll be flexible
                
                // Look for patterns in the binary data
                // Field elements are typically 32 bytes
                const fieldElements = [];
                const pointElements = [];
                
                // Extract all possible 32-byte field elements
                for (let i = 0; i <= bytes.length - 32; i += 32) {
                    const element = readFieldElement();
                    fieldElements.push(element);
                }
                
                console.log(`Extracted ${fieldElements.length} field elements`);
                
                // If we have at least 27 elements (minimum for IoTeX verifier)
                if (fieldElements.length >= 27) {
                    // Map to the expected structure
                    let idx = 0;
                    const components = {
                        // Initial and final state (z0, zi) - 3 elements
                        i_z0_zi: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0", 
                            fieldElements[idx++] || "0"
                        ],
                        
                        // U commitments (cmW and cmE) - 4 elements total
                        U_i_cmW_U_i_cmE: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        // u commitment W - 2 elements
                        u_i_cmW: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        // T commitment and randomness - 3 elements
                        cmT_r: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        // Groth16 proof points
                        pA: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        pB: [
                            [fieldElements[idx++] || "0", fieldElements[idx++] || "0"],
                            [fieldElements[idx++] || "0", fieldElements[idx++] || "0"]
                        ],
                        
                        pC: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        // KZG challenges and evaluations - 4 elements
                        challenge_W_challenge_E_kzg_evals: [
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0",
                            fieldElements[idx++] || "0"
                        ],
                        
                        // KZG proof - 2x2 elements
                        kzg_proof: [
                            [fieldElements[idx++] || "0", fieldElements[idx++] || "0"],
                            [fieldElements[idx++] || "0", fieldElements[idx++] || "0"]
                        ]
                    };
                    
                    console.log('Successfully mapped proof components');
                    return components;
                }
                
                // Not enough field elements
                throw new Error(`Only found ${fieldElements.length} field elements, need at least 27`);
                
            } catch (innerError) {
                console.error('Error during field extraction:', innerError);
                throw innerError;
            }
            
        } catch (error) {
            console.error('Error parsing zkEngine proof:', error);
            console.error('Offset at error:', offset);
            
            // Try alternative parsing if the format is different
            return this.tryAlternativeParsing(proofData);
        }
    }
    
    // Alternative parsing for different proof formats
    tryAlternativeParsing(proofData) {
        console.log('Trying alternative parsing methods...');
        
        // Check if proof_data is already in a parsed format
        if (proofData.parsed_components) {
            console.log('Found pre-parsed components');
            return this.convertParsedToCalldata(proofData.parsed_components);
        }
        
        // Check if it's a JSON-encoded proof
        try {
            const jsonProof = JSON.parse(proofData.proof_data);
            console.log('Proof appears to be JSON encoded');
            return this.parseJSONProof(jsonProof);
        } catch (e) {
            // Not JSON
        }
        
        // Check public inputs for clues about the format
        if (proofData.public_inputs) {
            console.log('Using public inputs to construct proof');
            return this.constructFromPublicInputs(proofData);
        }
        
        return null;
    }
    
    // Parse JSON-encoded proof
    parseJSONProof(jsonProof) {
        console.log('Parsing JSON proof format');
        
        // Map JSON fields to expected calldata format
        const components = {
            i_z0_zi: jsonProof.i_z0_zi || jsonProof.initial_final || [],
            U_i_cmW_U_i_cmE: jsonProof.U_i_cmW_U_i_cmE || jsonProof.U_commitments || [],
            u_i_cmW: jsonProof.u_i_cmW || jsonProof.u_commitment || [],
            cmT_r: jsonProof.cmT_r || jsonProof.T_commitment || [],
            pA: jsonProof.pA || jsonProof.proof_A || [],
            pB: jsonProof.pB || jsonProof.proof_B || [[], []],
            pC: jsonProof.pC || jsonProof.proof_C || [],
            challenge_W_challenge_E_kzg_evals: jsonProof.challenges || [],
            kzg_proof: jsonProof.kzg_proof || [[], []]
        };
        
        // Convert all values to decimal strings
        return this.convertToDecimalStrings(components);
    }
    
    // Construct proof from public inputs (fallback)
    constructFromPublicInputs(proofData) {
        console.log('Constructing proof from public inputs');
        
        const publicInputs = proofData.public_inputs;
        
        // Extract device coordinates from public inputs
        let x = '5050', y = '5050';
        if (publicInputs.execution_z0) {
            // First two elements are typically x and y coordinates
            x = publicInputs.execution_z0[0] || x;
            y = publicInputs.execution_z0[1] || y;
        }
        
        // For now, return a placeholder that will fail verification
        // but at least has the correct structure
        console.warn('Using placeholder proof structure - will fail verification');
        
        return {
            i_z0_zi: [x, y, '1'], // x, y, within_proximity
            U_i_cmW_U_i_cmE: Array(4).fill('0'),
            u_i_cmW: Array(2).fill('0'),
            cmT_r: Array(3).fill('0'),
            pA: Array(2).fill('0'),
            pB: [Array(2).fill('0'), Array(2).fill('0')],
            pC: Array(2).fill('0'),
            challenge_W_challenge_E_kzg_evals: Array(4).fill('0'),
            kzg_proof: [Array(2).fill('0'), Array(2).fill('0')]
        };
    }
    
    // Convert parsed components to decimal strings
    convertToDecimalStrings(components) {
        const convert = (value) => {
            if (typeof value === 'string') {
                // If it's a hex string, convert to decimal
                if (value.startsWith('0x')) {
                    return BigInt(value).toString(10);
                }
                // Otherwise assume it's already decimal
                return value;
            } else if (typeof value === 'bigint') {
                return value.toString(10);
            } else if (typeof value === 'number') {
                return value.toString();
            } else if (Array.isArray(value)) {
                return value.map(convert);
            }
            return '0';
        };
        
        return {
            i_z0_zi: convert(components.i_z0_zi),
            U_i_cmW_U_i_cmE: convert(components.U_i_cmW_U_i_cmE),
            u_i_cmW: convert(components.u_i_cmW),
            cmT_r: convert(components.cmT_r),
            pA: convert(components.pA),
            pB: convert(components.pB),
            pC: convert(components.pC),
            challenge_W_challenge_E_kzg_evals: convert(components.challenge_W_challenge_E_kzg_evals),
            kzg_proof: convert(components.kzg_proof)
        };
    }
    
    // Format for IoTeX contract (convert decimal strings to hex)
    formatForIoTeXContract(components, x, y) {
        console.log('Formatting for IoTeX contract');
        
        if (!components) {
            console.error('No components to format');
            return null;
        }
        
        // Helper to convert decimal string to 0x-prefixed hex
        const toHex = (decimalStr) => {
            try {
                const bigIntValue = BigInt(decimalStr);
                const hex = bigIntValue.toString(16);
                return '0x' + hex.padStart(64, '0');
            } catch (e) {
                console.error('Error converting to hex:', decimalStr, e);
                return '0x' + '0'.repeat(64);
            }
        };
        
        // Convert all decimal strings to hex format
        const formatted = {
            i_z0_zi: components.i_z0_zi.map(toHex),
            U_i_cmW_U_i_cmE: components.U_i_cmW_U_i_cmE.map(toHex),
            u_i_cmW: components.u_i_cmW.map(toHex),
            cmT_r: components.cmT_r.map(toHex),
            pA: components.pA.map(toHex),
            pB: components.pB.map(row => row.map(toHex)),
            pC: components.pC.map(toHex),
            challenge_W_challenge_E_kzg_evals: components.challenge_W_challenge_E_kzg_evals.map(toHex),
            kzg_proof: components.kzg_proof.map(row => row.map(toHex))
        };
        
        // Override x,y in i_z0_zi if provided
        if (x !== undefined && y !== undefined) {
            formatted.i_z0_zi[0] = toHex(x.toString());
            formatted.i_z0_zi[1] = toHex(y.toString());
        }
        
        console.log('Formatted proof ready for contract');
        return formatted;
    }
}

// Make it globally available
window.ZKEngineCalldataParser = ZKEngineCalldataParser;