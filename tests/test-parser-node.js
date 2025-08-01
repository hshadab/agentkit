// Test zkEngine calldata parser in Node.js environment
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simulate browser globals
global.window = {
    debugLog: console.log
};

// Load the parser
const parserCode = readFileSync(join(__dirname, '../static/parsers/nova/zkengine-calldata-parser.js'), 'utf8');

// Create a function wrapper to properly define the class
const createParser = new Function('window', parserCode + '; return ZKEngineCalldataParser;');
const ZKEngineCalldataParser = createParser(global.window);

const parser = new ZKEngineCalldataParser();

console.log('=== Testing zkEngine Calldata Parser ===\n');

// Test 1: Simulated proof with valid structure
console.log('Test 1: Simulated zkEngine proof');
try {
    // Create a simulated proof (32 field elements * 32 bytes each = 1024 bytes)
    const numFieldElements = 32;
    const fieldElementSize = 32;
    const proofSize = numFieldElements * fieldElementSize;
    const proofBytes = new Uint8Array(proofSize);
    
    // Fill with test data
    for (let i = 0; i < numFieldElements; i++) {
        const start = i * fieldElementSize;
        for (let j = 0; j < fieldElementSize; j++) {
            proofBytes[start + j] = (i + j) % 256;
        }
    }
    
    // Convert to base64 (simulating zkEngine output)
    const binaryString = Array.from(proofBytes).map(b => String.fromCharCode(b)).join('');
    const base64Proof = Buffer.from(binaryString, 'binary').toString('base64');
    
    const proofData = {
        proof_data: base64Proof,
        public_inputs: {
            execution_z0: ["5050", "5050"],
            IC_i: ["1", "2", "3"]
        }
    };
    
    console.log(`Created proof: ${base64Proof.length} chars (base64), ${proofSize} bytes`);
    
    // Parse the proof
    const components = parser.parseZKEngineProof(proofData);
    
    if (components) {
        console.log('✅ Successfully parsed proof components');
        console.log(`  - i_z0_zi: ${components.i_z0_zi.length} elements`);
        console.log(`  - U_i_cmW_U_i_cmE: ${components.U_i_cmW_U_i_cmE.length} elements`);
        console.log(`  - pA: ${components.pA.length} elements`);
        console.log(`  - pB: ${components.pB.length}x${components.pB[0].length} matrix`);
        
        // Test formatting
        const formatted = parser.formatForIoTeXContract(components, "5050", "5050");
        if (formatted) {
            console.log('✅ Successfully formatted for IoTeX contract');
            console.log(`  - First coordinate (hex): ${formatted.i_z0_zi[0]}`);
            console.log(`  - Second coordinate (hex): ${formatted.i_z0_zi[1]}`);
            
            // Verify hex format
            const isValidHex = formatted.i_z0_zi[0].startsWith('0x') && 
                             formatted.i_z0_zi[0].length === 66; // 0x + 64 chars
            console.log(`  - Valid hex format: ${isValidHex ? '✅' : '❌'}`);
        }
    } else {
        console.log('❌ Failed to parse proof');
    }
} catch (error) {
    console.error('❌ Test 1 failed:', error.message);
}

console.log('\n---\n');

// Test 2: Edge cases
console.log('Test 2: Edge cases');
try {
    // Test with empty proof
    const emptyResult = parser.parseZKEngineProof({ proof_data: '' });
    console.log(`Empty proof: ${emptyResult ? '❌ Should fail' : '✅ Correctly rejected'}`);
    
    // Test with invalid base64
    const invalidResult = parser.parseZKEngineProof({ proof_data: 'not-valid-base64!' });
    console.log(`Invalid base64: ${invalidResult ? '❌ Should fail' : '✅ Correctly rejected'}`);
    
    // Test with too small proof
    const smallProof = Buffer.from('small').toString('base64');
    const smallResult = parser.parseZKEngineProof({ proof_data: smallProof });
    console.log(`Too small proof: ${smallResult ? '❌ Should fail' : '✅ Correctly rejected'}`);
    
} catch (error) {
    console.error('❌ Test 2 failed:', error.message);
}

console.log('\n---\n');

// Test 3: Alternative parsing methods
console.log('Test 3: Alternative parsing (JSON format)');
try {
    // Test JSON-encoded proof
    const jsonProof = {
        i_z0_zi: ["5080", "5020", "1"],
        U_i_cmW_U_i_cmE: ["100", "200", "300", "400"],
        u_i_cmW: ["500", "600"],
        cmT_r: ["700", "800", "900"],
        pA: ["1000", "1100"],
        pB: [["1200", "1300"], ["1400", "1500"]],
        pC: ["1600", "1700"],
        challenge_W_challenge_E_kzg_evals: ["1800", "1900", "2000", "2100"],
        kzg_proof: [["2200", "2300"], ["2400", "2500"]]
    };
    
    const jsonProofData = {
        proof_data: Buffer.from(JSON.stringify(jsonProof)).toString('base64'),
        public_inputs: {}
    };
    
    const jsonComponents = parser.parseZKEngineProof(jsonProofData);
    if (jsonComponents) {
        console.log('✅ Successfully parsed JSON proof');
        const formatted = parser.formatForIoTeXContract(jsonComponents, "5080", "5020");
        if (formatted && formatted.i_z0_zi[0].startsWith('0x')) {
            console.log('✅ Successfully formatted JSON proof to hex');
        }
    }
} catch (error) {
    console.error('❌ Test 3 failed:', error.message);
}

console.log('\n=== All tests completed ===');