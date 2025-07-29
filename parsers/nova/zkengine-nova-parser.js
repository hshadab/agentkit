// zkEngine Nova Proof Parser
// Based on analysis of zkEngine repository - proofs are JSON-serialized, not raw binary

class ZKEngineNovaParser {
    constructor() {
        console.log('ZKEngine Nova Parser initialized');
    }
    
    // Parse zkEngine proof data
    parseZKEngineProof(proofData) {
        console.log('=== ZKENGINE NOVA PARSER ===');
        
        if (!proofData || !proofData.proof_data) {
            console.error('No proof data provided');
            return null;
        }
        
        try {
            // First, decode the base64
            const decoded = atob(proofData.proof_data);
            console.log(`Decoded proof size: ${decoded.length} bytes`);
            console.log(`First 100 chars: ${decoded.substring(0, 100)}`);
            
            // Check if it's JSON (zkEngine uses serde_json)
            if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
                console.log('Detected JSON-serialized proof');
                
                try {
                    const jsonProof = JSON.parse(decoded);
                    console.log('Successfully parsed JSON proof:', Object.keys(jsonProof));
                    
                    // Extract Nova proof components from JSON structure
                    return this.extractNovaComponentsFromJSON(jsonProof);
                } catch (jsonError) {
                    console.error('Failed to parse as JSON:', jsonError);
                }
            }
            
            // If not JSON, try binary parsing
            console.log('Attempting binary parsing...');
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            
            return this.extractNovaComponentsFromBinary(bytes);
            
        } catch (error) {
            console.error('Failed to parse zkEngine proof:', error);
            return null;
        }
    }
    
    // Extract Nova components from JSON structure
    extractNovaComponentsFromJSON(jsonProof) {
        console.log('Extracting Nova components from JSON...');
        
        // zkEngine proof structure based on the example:
        // It serializes a SNARK proof and a ZKWASMInstance
        
        // Common patterns in Nova proofs
        const components = {
            commitments: [],
            challenges: [],
            evaluations: [],
            proof_points: []
        };
        
        // Recursively extract field elements that look like proof data
        const extractFieldElements = (obj, path = '') => {
            if (typeof obj === 'string') {
                // Check if it's a hex string (field element)
                if (obj.match(/^(0x)?[0-9a-fA-F]{32,}$/)) {
                    components.commitments.push(obj.startsWith('0x') ? obj : '0x' + obj);
                }
            } else if (Array.isArray(obj)) {
                obj.forEach((item, idx) => extractFieldElements(item, `${path}[${idx}]`));
            } else if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    extractFieldElements(obj[key], `${path}.${key}`);
                });
            }
        };
        
        extractFieldElements(jsonProof);
        
        console.log(`Extracted ${components.commitments.length} field elements from JSON`);
        
        // If we have enough components, return them
        if (components.commitments.length >= 27) {
            return components;
        }
        
        // Try specific zkEngine/Nova fields
        if (jsonProof.proof) {
            extractFieldElements(jsonProof.proof);
        }
        if (jsonProof.instance) {
            extractFieldElements(jsonProof.instance);
        }
        
        return components.commitments.length > 0 ? components : null;
    }
    
    // Extract Nova components from binary data
    extractNovaComponentsFromBinary(bytes) {
        console.log('Extracting Nova components from binary...');
        
        const FIELD_SIZE = 32;
        const components = {
            commitments: [],
            challenges: [],
            evaluations: [],
            proof_points: []
        };
        
        // Helper to read field element
        const readFieldElement = (offset) => {
            if (offset + FIELD_SIZE > bytes.length) return null;
            
            const fieldBytes = bytes.slice(offset, offset + FIELD_SIZE);
            
            // Check if it's not all zeros
            const nonZeroCount = fieldBytes.filter(b => b !== 0).length;
            if (nonZeroCount < 4) return null;
            
            // Convert to hex (assume little-endian)
            const hex = '0x' + Array.from(fieldBytes.reverse())
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            return hex;
        };
        
        // Scan for field elements
        let offset = 0;
        while (offset + FIELD_SIZE <= bytes.length && components.commitments.length < 50) {
            const element = readFieldElement(offset);
            if (element) {
                components.commitments.push(element);
            }
            offset += FIELD_SIZE;
        }
        
        console.log(`Extracted ${components.commitments.length} field elements from binary`);
        
        return components.commitments.length >= 27 ? components : null;
    }
    
    // Format extracted components for IoTeX contract
    formatForIoTeXContract(components, x, y) {
        if (!components || components.commitments.length < 27) {
            console.error('Insufficient components for contract format');
            return null;
        }
        
        const elements = components.commitments;
        let idx = 0;
        
        // Map to IoTeX Nova Decider format
        const formatted = {
            i_z0_zi: [
                '0x' + BigInt(x || 5050).toString(16).padStart(64, '0'),
                '0x' + BigInt(y || 5050).toString(16).padStart(64, '0'),
                '0x0000000000000000000000000000000000000000000000000000000000000001'
            ],
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
        
        // Ensure all values are properly formatted
        const ensureFormat = (val) => {
            if (typeof val === 'string' && val.startsWith('0x')) {
                return val.padEnd(66, '0');
            }
            return '0x' + '0'.repeat(64);
        };
        
        // Format all components
        Object.keys(formatted).forEach(key => {
            if (Array.isArray(formatted[key])) {
                if (Array.isArray(formatted[key][0])) {
                    // 2D array
                    formatted[key] = formatted[key].map(row => row.map(ensureFormat));
                } else {
                    // 1D array
                    formatted[key] = formatted[key].map(ensureFormat);
                }
            }
        });
        
        return formatted;
    }
}

// Export globally
window.ZKEngineNovaParser = ZKEngineNovaParser;