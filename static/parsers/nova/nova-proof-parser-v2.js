// Nova Proof Parser V2 - Enhanced parser for zkEngine outputs
// Fixes the parsing issues that cause on-chain verification failures

class NovaProofParserV2 {
    constructor() {
        // zkEngine proof constants
        this.FIELD_SIZE = 32;
        this.POINT_SIZE = 64;
        
        // Expected Nova proof structure from zkEngine
        this.EXPECTED_COMPONENTS = {
            i_z0_zi: 3,              // Initial and final state
            U_i_cmW_U_i_cmE: 4,      // U folding instance commitments
            u_i_cmW: 2,              // u folding instance commitment
            cmT_r: 3,                // T commitment and randomness
            pA: 2,                   // Groth16 A point
            pB: 4,                   // Groth16 B (2x2)
            pC: 2,                   // Groth16 C point
            challenges: 4,           // KZG challenges
            kzg_proof: 4            // KZG proof (2 points)
        };
    }
    
    // Main entry point
    parseZKEngineProof(proofData) {
        console.log('=== Nova Proof Parser V2 ===');
        
        if (!proofData || !proofData.proof_data) {
            console.error('No proof data provided');
            return null;
        }
        
        try {
            // Decode base64
            const decoded = atob(proofData.proof_data);
            console.log(`Decoded size: ${decoded.length} bytes`);
            
            // Convert to byte array
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            
            // Try different parsing strategies
            let parsed = null;
            
            // Strategy 1: Check if it's JSON
            if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
                console.log('Attempting JSON parse...');
                parsed = this.parseJSON(decoded);
            }
            
            // Strategy 2: Parse as binary Nova proof
            if (!parsed) {
                console.log('Attempting binary parse...');
                parsed = this.parseBinary(bytes);
            }
            
            // Strategy 3: Use public inputs to reconstruct
            if (!parsed && proofData.public_inputs) {
                console.log('Attempting reconstruction from public inputs...');
                parsed = this.reconstructFromPublicInputs(proofData.public_inputs, bytes);
            }
            
            return parsed;
            
        } catch (error) {
            console.error('Failed to parse zkEngine proof:', error);
            return null;
        }
    }
    
    // Parse JSON-encoded proof
    parseJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            console.log('Successfully parsed JSON:', Object.keys(parsed));
            
            // Extract field elements recursively
            const elements = [];
            this.extractFieldElements(parsed, elements);
            
            if (elements.length >= 27) {
                return this.structureElements(elements);
            }
            
            return null;
        } catch (e) {
            console.log('Not valid JSON:', e.message);
            return null;
        }
    }
    
    // Parse binary Nova proof
    parseBinary(bytes) {
        console.log('Parsing binary Nova proof...');
        
        // Find proof data start
        const proofStart = this.findProofStart(bytes);
        console.log(`Proof start offset: ${proofStart}`);
        
        let offset = proofStart;
        const elements = [];
        
        // Read field elements
        while (offset + this.FIELD_SIZE <= bytes.length && elements.length < 100) {
            const element = this.readFieldElement(bytes, offset);
            if (element && !this.isZeroElement(element)) {
                elements.push(element);
            }
            offset += this.FIELD_SIZE;
        }
        
        console.log(`Extracted ${elements.length} non-zero field elements`);
        
        if (elements.length >= 27) {
            return this.structureElements(elements);
        }
        
        return null;
    }
    
    // Find the start of actual proof data
    findProofStart(bytes) {
        // zkEngine proofs have a header followed by the actual proof
        // Look for patterns that indicate the start of field elements
        
        // Common header sizes in zkEngine
        const commonOffsets = [0, 4, 8, 16, 32, 64, 128, 256, 512, 604, 1024];
        
        for (const offset of commonOffsets) {
            if (offset + this.FIELD_SIZE <= bytes.length) {
                // Check if we have valid field elements at this offset
                let validCount = 0;
                for (let i = 0; i < 5; i++) {
                    const fieldOffset = offset + i * this.FIELD_SIZE;
                    if (fieldOffset + this.FIELD_SIZE <= bytes.length) {
                        const element = this.readFieldElement(bytes, fieldOffset);
                        if (element && !this.isZeroElement(element)) {
                            validCount++;
                        }
                    }
                }
                
                if (validCount >= 3) {
                    console.log(`Found valid field elements at offset ${offset}`);
                    return offset;
                }
            }
        }
        
        // Fallback: scan for first non-zero sequence
        for (let i = 0; i < Math.min(2048, bytes.length - this.FIELD_SIZE); i++) {
            let nonZeroCount = 0;
            for (let j = 0; j < this.FIELD_SIZE; j++) {
                if (bytes[i + j] !== 0) nonZeroCount++;
            }
            if (nonZeroCount > 16) {
                return Math.floor(i / this.FIELD_SIZE) * this.FIELD_SIZE;
            }
        }
        
        return 0;
    }
    
    // Read a field element from bytes
    readFieldElement(bytes, offset) {
        if (offset + this.FIELD_SIZE > bytes.length) return null;
        
        const fieldBytes = bytes.slice(offset, offset + this.FIELD_SIZE);
        
        // Convert to hex (little-endian to big-endian)
        const hex = '0x' + Array.from(fieldBytes.reverse())
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
        return hex;
    }
    
    // Check if element is all zeros
    isZeroElement(element) {
        return element === '0x' + '0'.repeat(64);
    }
    
    // Extract field elements from JSON recursively
    extractFieldElements(obj, elements) {
        if (typeof obj === 'string') {
            // Check if it's a hex string
            if (obj.match(/^(0x)?[0-9a-fA-F]{32,}$/)) {
                const normalized = obj.startsWith('0x') ? obj : '0x' + obj;
                elements.push(normalized.padEnd(66, '0'));
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(item => this.extractFieldElements(item, elements));
        } else if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(value => this.extractFieldElements(value, elements));
        }
    }
    
    // Structure elements into Nova proof format
    structureElements(elements) {
        console.log('Structuring elements into Nova proof format...');
        
        // Ensure we have enough elements
        if (elements.length < 27) {
            console.error(`Insufficient elements: ${elements.length} < 27`);
            return null;
        }
        
        let idx = 0;
        
        const proof = {
            // Skip i_z0_zi - will be set from coordinates
            U_i_cmW_U_i_cmE: elements.slice(idx, idx += 4),
            u_i_cmW: elements.slice(idx, idx += 2),
            cmT_r: elements.slice(idx, idx += 3),
            pA: elements.slice(idx, idx += 2),
            pB: [
                elements.slice(idx, idx += 2),
                elements.slice(idx, idx += 2)
            ],
            pC: elements.slice(idx, idx += 2),
            challenge_W_challenge_E_kzg_evals: elements.slice(idx, idx += 4),
            kzg_proof: [
                elements.slice(idx, idx += 2),
                elements.slice(idx, idx += 2)
            ]
        };
        
        return proof;
    }
    
    // Reconstruct proof from public inputs
    reconstructFromPublicInputs(publicInputs, bytes) {
        console.log('Reconstructing from public inputs...');
        
        // Use public inputs to guide parsing
        if (!publicInputs || !publicInputs.execution_z0) {
            return null;
        }
        
        // The public inputs contain hints about the proof structure
        const hints = {
            hasExecution: !!publicInputs.execution_z0,
            hasOps: !!publicInputs.ops_z0,
            hasScan: !!publicInputs.scan_z0
        };
        
        console.log('Public input hints:', hints);
        
        // Try parsing with hints
        return this.parseBinary(bytes);
    }
    
    // Format for IoTeX contract
    formatForIoTeXContract(parsedProof, x, y) {
        if (!parsedProof) {
            console.error('No parsed proof to format');
            return null;
        }
        
        // Calculate device position and proximity
        const deviceX = BigInt(x || 5050);
        const deviceY = BigInt(y || 5050);
        const centerX = BigInt(5000);
        const centerY = BigInt(5000);
        const radius = BigInt(100);
        
        const dx = deviceX > centerX ? deviceX - centerX : centerX - deviceX;
        const dy = deviceY > centerY ? deviceY - centerY : centerY - deviceY;
        const distanceSquared = dx * dx + dy * dy;
        const isWithinRadius = distanceSquared <= (radius * radius);
        
        // Set i_z0_zi based on coordinates and result
        const i_z0_zi = [
            '0x' + deviceX.toString(16).padStart(64, '0'),
            '0x' + deviceY.toString(16).padStart(64, '0'),
            '0x' + (isWithinRadius ? '1' : '0').padStart(64, '0')
        ];
        
        // Ensure all values are properly formatted
        const ensureFormat = (val) => {
            if (!val) return '0x' + '0'.repeat(64);
            if (typeof val === 'string' && val.startsWith('0x')) {
                // Ensure exactly 66 characters (0x + 64)
                if (val.length < 66) {
                    return val + '0'.repeat(66 - val.length);
                } else if (val.length > 66) {
                    return val.substring(0, 66);
                }
                return val;
            }
            return '0x' + '0'.repeat(64);
        };
        
        // Format all components
        const formatted = {
            i_z0_zi: i_z0_zi,
            U_i_cmW_U_i_cmE: parsedProof.U_i_cmW_U_i_cmE.map(ensureFormat),
            u_i_cmW: parsedProof.u_i_cmW.map(ensureFormat),
            cmT_r: parsedProof.cmT_r.map(ensureFormat),
            pA: parsedProof.pA.map(ensureFormat),
            pB: parsedProof.pB.map(row => row.map(ensureFormat)),
            pC: parsedProof.pC.map(ensureFormat),
            challenge_W_challenge_E_kzg_evals: parsedProof.challenge_W_challenge_E_kzg_evals.map(ensureFormat),
            kzg_proof: parsedProof.kzg_proof.map(row => row.map(ensureFormat))
        };
        
        // Validate structure
        const valid = this.validateStructure(formatted);
        if (!valid) {
            console.error('Invalid proof structure after formatting');
            return null;
        }
        
        return formatted;
    }
    
    // Validate proof structure
    validateStructure(proof) {
        const checks = [
            { name: 'i_z0_zi', actual: proof.i_z0_zi.length, expected: 3 },
            { name: 'U_i_cmW_U_i_cmE', actual: proof.U_i_cmW_U_i_cmE.length, expected: 4 },
            { name: 'u_i_cmW', actual: proof.u_i_cmW.length, expected: 2 },
            { name: 'cmT_r', actual: proof.cmT_r.length, expected: 3 },
            { name: 'pA', actual: proof.pA.length, expected: 2 },
            { name: 'pB', actual: proof.pB.length * proof.pB[0].length, expected: 4 },
            { name: 'pC', actual: proof.pC.length, expected: 2 },
            { name: 'challenges', actual: proof.challenge_W_challenge_E_kzg_evals.length, expected: 4 },
            { name: 'kzg_proof', actual: proof.kzg_proof.length * proof.kzg_proof[0].length, expected: 4 }
        ];
        
        let valid = true;
        checks.forEach(check => {
            if (check.actual !== check.expected) {
                console.error(`Invalid ${check.name}: ${check.actual} != ${check.expected}`);
                valid = false;
            }
        });
        
        return valid;
    }
}

// Export globally
window.NovaProofParserV2 = NovaProofParserV2;