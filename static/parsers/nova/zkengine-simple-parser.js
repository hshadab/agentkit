// Simplified zkEngine parser - tries to find coordinates in the proof

class ZKEngineSimpleParser {
    parseProofBinary(proofData) {
        console.log('=== SIMPLE ZKENGINE PARSER ===');
        
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
            
            // Look for 5050 (0x13BA) in little-endian format
            const target = [0xBA, 0x13];  // 5050 in LE
            const matches = [];
            
            for (let i = 0; i <= bytes.length - 32; i++) {
                // Check if this position has our target value
                if (bytes[i] === target[0] && bytes[i+1] === target[1]) {
                    // Check if rest of the 32-byte field is zeros (valid field element)
                    let isValid = true;
                    for (let j = 2; j < 32; j++) {
                        if (bytes[i+j] !== 0) {
                            isValid = false;
                            break;
                        }
                    }
                    if (isValid) {
                        matches.push(i);
                        console.log(`Found 5050 at offset ${i}`);
                    }
                }
            }
            
            console.log(`Found ${matches.length} instances of 5050 at offsets:`, matches);
            
            if (matches.length >= 1) {
                // Use the first match as the start of proof data
                const proofStart = matches[0];
                console.log(`Proof likely starts at offset ${proofStart}`);
                
                // Check if second coordinate is at expected position
                const expectedSecondCoord = proofStart + 32;
                if (matches.includes(expectedSecondCoord)) {
                    console.log('✓ Second coordinate found at expected position');
                } else {
                    console.log('⚠️  Second coordinate NOT at expected position');
                    console.log(`Expected at ${expectedSecondCoord}, found at:`, matches.filter(m => m > proofStart));
                    
                    // Check what's at the expected position
                    if (expectedSecondCoord + 32 <= bytes.length) {
                        const secondFieldBytes = bytes.slice(expectedSecondCoord, expectedSecondCoord + 32);
                        console.log('Bytes at expected y position:', Array.from(secondFieldBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
                    }
                }
                
                // Parse from this offset regardless
                return this.parseFromOffset(bytes, proofStart);
            } else {
                console.log('Could not find coordinate value 5050 in proof');
                console.log('This suggests the proof may be for different coordinates');
                
                // Try to find any valid field elements
                console.log('Scanning for valid field elements...');
                for (let i = 0; i <= bytes.length - 32; i++) {
                    // Check if this looks like a valid small field element
                    let nonZeroCount = 0;
                    for (let j = 0; j < 32; j++) {
                        if (bytes[i + j] !== 0) nonZeroCount++;
                    }
                    if (nonZeroCount <= 4 && nonZeroCount > 0) {
                        console.log(`Potential field element at offset ${i}`);
                        return this.parseFromOffset(bytes, i);
                    }
                }
                
                console.log('Falling back to offset 0');
                return this.parseFromOffset(bytes, 0);
            }
            
        } catch (error) {
            console.error('Error in simple parser:', error);
            return null;
        }
    }
    
    parseFromOffset(bytes, offset) {
        const FIELD_SIZE = 32;
        const EXPECTED_FIELDS = 28;
        
        const fieldElements = [];
        for (let i = 0; i < EXPECTED_FIELDS; i++) {
            const start = offset + (i * FIELD_SIZE);
            const end = start + FIELD_SIZE;
            
            if (end > bytes.length) {
                console.error(`Not enough data at offset ${offset}`);
                return null;
            }
            
            const fieldBytes = bytes.slice(start, end);
            
            // Convert LE bytes to decimal
            let value = 0n;
            for (let j = fieldBytes.length - 1; j >= 0; j--) {
                value = (value << 8n) | BigInt(fieldBytes[j]);
            }
            
            fieldElements.push(value.toString(10));
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
        
        console.log('Parsed components - first coordinates:');
        console.log('x:', components.i_z0_zi[0], '(hex:', BigInt(components.i_z0_zi[0]).toString(16), ')');
        console.log('y:', components.i_z0_zi[1], '(hex:', BigInt(components.i_z0_zi[1]).toString(16), ')');
        console.log('proximity:', components.i_z0_zi[2], '(hex:', BigInt(components.i_z0_zi[2]).toString(16), ')');
        
        // Debug: show raw bytes for first 3 fields
        console.log('\nDebug - Raw field bytes:');
        for (let i = 0; i < 3; i++) {
            const start = offset + (i * 32);
            const fieldBytes = bytes.slice(start, start + 32);
            console.log(`Field ${i}:`, Array.from(fieldBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '), '...')
        }
        
        return components;
    }
    
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
window.ZKEngineSimpleParser = ZKEngineSimpleParser;