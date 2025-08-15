// ZKEngine Binary Parser for IoTeX
// Correctly parses the zkEngine proof.bin output format

class ZKEngineBinaryParser {
    constructor() {
        this.debugLog = window.debugLog || console.log;
    }
    
    // Parse the zkEngine proof.bin file
    parseProofBinary(proofData) {
        console.log('=== ZKENGINE BINARY PARSER ===');
        
        if (!proofData || !proofData.proof_data) {
            console.error('No proof_data found');
            return null;
        }
        
        try {
            // Decode base64 to binary
            const binaryString = atob(proofData.proof_data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log(`Binary size: ${bytes.length} bytes`);
            
            // Log first 256 bytes to understand structure
            console.log('First 256 bytes of proof:');
            for (let i = 0; i < Math.min(256, bytes.length); i += 32) {
                const row = Array.from(bytes.slice(i, i + 32)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                console.log(`[${i.toString().padStart(3, '0')}-${(i+31).toString().padStart(3, '0')}]: ${row}`);
            }
            
            // The zkEngine output format (based on Rust implementation):
            // The proof.bin contains the calldata that should be passed to the contract
            // It's already formatted as field elements for the Nova verifier
            
            // Based on the contract expecting 9 parameters with specific lengths:
            // 1. i_z0_zi: 3 elements (initial state z0 and final state zi)
            // 2. U_i_cmW_U_i_cmE: 4 elements
            // 3. u_i_cmW: 2 elements  
            // 4. cmT_r: 3 elements
            // 5. pA: 2 elements
            // 6. pB: 2x2 = 4 elements
            // 7. pC: 2 elements
            // 8. challenge_W_challenge_E_kzg_evals: 4 elements
            // 9. kzg_proof: 2x2 = 4 elements
            // Total: 28 field elements * 32 bytes = 896 bytes
            
            const FIELD_SIZE = 32;
            const EXPECTED_FIELDS = 28;
            const EXPECTED_SIZE = EXPECTED_FIELDS * FIELD_SIZE;
            
            // The proof might have additional metadata, so look for the actual proof data
            // The calldata starts after any metadata
            
            let offset = 0;
            
            // If the binary is exactly the expected size, it's pure calldata
            if (bytes.length === EXPECTED_SIZE) {
                console.log('Binary is exactly calldata size');
                offset = 0;
            } else if (bytes.length > EXPECTED_SIZE) {
                // Look for the start of valid field elements
                // Field elements in BN254 are < field modulus
                // First bytes of a valid field element are usually 0x00
                console.log('Binary larger than expected, searching for calldata...');
                
                // Try to find a sequence of 28 valid field elements
                for (let i = 0; i <= bytes.length - EXPECTED_SIZE; i++) {
                    // Check if this could be the start of valid calldata
                    // Most field elements start with 0x00 bytes
                    if (this.looksLikeFieldElement(bytes, i)) {
                        offset = i;
                        console.log(`Found potential calldata at offset ${i}`);
                        break;
                    }
                }
            } else {
                console.error(`Binary too small: ${bytes.length} bytes, expected ${EXPECTED_SIZE}`);
                return null;
            }
            
            // Extract field elements
            const fieldElements = [];
            for (let i = 0; i < EXPECTED_FIELDS; i++) {
                const start = offset + (i * FIELD_SIZE);
                const end = start + FIELD_SIZE;
                
                if (end > bytes.length) {
                    console.error(`Not enough data for field ${i}`);
                    return null;
                }
                
                const fieldBytes = bytes.slice(start, end);
                
                // Special logging for first 3 elements (coordinates)
                if (i < 3) {
                    console.log(`Field ${i} bytes:`, Array.from(fieldBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
                    
                    // Try both endianness to debug
                    let leValue = 0n;
                    for (let j = fieldBytes.length - 1; j >= 0; j--) {
                        leValue = (leValue << 8n) | BigInt(fieldBytes[j]);
                    }
                    
                    let beValue = 0n;
                    for (let j = 0; j < fieldBytes.length; j++) {
                        beValue = (beValue << 8n) | BigInt(fieldBytes[j]);
                    }
                    
                    console.log(`  LE: ${leValue} (${leValue.toString(16)})`);
                    console.log(`  BE: ${beValue} (${beValue.toString(16)})`);
                }
                
                const fieldValue = this.bytesToDecimal(fieldBytes);
                fieldElements.push(fieldValue);
            }
            
            console.log(`Extracted ${fieldElements.length} field elements`);
            
            // Log first few bytes of each element for debugging
            console.log('Sample field elements (first 3):');
            for (let i = 0; i < Math.min(3, fieldElements.length); i++) {
                const decimal = fieldElements[i];
                const hex = BigInt(decimal).toString(16);
                console.log(`  [${i}]: ${hex.substring(0, 16)}... (${hex.length} hex chars)`);
            }
            
            // Map to contract parameters
            let idx = 0;
            const components = {
                i_z0_zi: [
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                U_i_cmW_U_i_cmE: [
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                u_i_cmW: [
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                cmT_r: [
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                pA: [
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                pB: [
                    [fieldElements[idx++], fieldElements[idx++]],
                    [fieldElements[idx++], fieldElements[idx++]]
                ],
                pC: [
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                challenge_W_challenge_E_kzg_evals: [
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++],
                    fieldElements[idx++]
                ],
                kzg_proof: [
                    [fieldElements[idx++], fieldElements[idx++]],
                    [fieldElements[idx++], fieldElements[idx++]]
                ]
            };
            
            console.log('Successfully parsed zkEngine proof');
            return components;
            
        } catch (error) {
            console.error('Error parsing zkEngine binary:', error);
            return null;
        }
    }
    
    // Check if bytes at offset look like a field element
    looksLikeFieldElement(bytes, offset) {
        if (offset + 32 > bytes.length) return false;
        
        // Field elements in BN254 are < field modulus
        // With little-endian format, most significant bytes are at the END
        let zeroCount = 0;
        for (let i = 24; i < 32; i++) {  // Check last 8 bytes
            if (bytes[offset + i] === 0) zeroCount++;
        }
        
        // At least 4 of the last 8 bytes should be zero for a valid field element
        return zeroCount >= 4;
    }
    
    // Convert bytes to decimal string (little-endian - zkEngine uses LE)
    bytesToDecimal(bytes) {
        let result = 0n;
        // Read in little-endian order
        for (let i = bytes.length - 1; i >= 0; i--) {
            result = (result << 8n) | BigInt(bytes[i]);
        }
        return result.toString(10);
    }
    
    // Format components for IoTeX contract (convert to hex)
    formatForContract(components) {
        const toHex = (decimal) => {
            try {
                const bn = BigInt(decimal);
                const hex = bn.toString(16);
                return '0x' + hex.padStart(64, '0');
            } catch (e) {
                console.error('Error converting to hex:', decimal, e);
                return '0x' + '0'.repeat(64);
            }
        };
        
        return {
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
    }
}

// Make it available globally
window.ZKEngineBinaryParser = ZKEngineBinaryParser;