#!/usr/bin/env node

/**
 * Automated contract verification on Basescan
 * This completes the deployment by publishing source code to the explorer
 */

const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';
const COMPILER_VERSION = 'v0.8.30+commit.d5a61349'; // Detected from bytecode
const NETWORK = 'base-sepolia';
const API_URL = 'https://api-sepolia.basescan.org/api';

async function verifyContract(apiKey) {
    console.log('🔐 Automated Contract Source Verification');
    console.log('==========================================\n');

    // Read source code
    const sourcePath = path.join(__dirname, 'contracts/AgentAuthorizationSimpleVerifier.sol');
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
    }

    const sourceCode = fs.readFileSync(sourcePath, 'utf8');
    console.log(`✅ Source code loaded (${sourceCode.length} chars)`);
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🔧 Compiler: ${COMPILER_VERSION}`);
    console.log(`🌐 Network: ${NETWORK}\n`);

    // Step 1: Submit verification
    console.log('📤 Step 1: Submitting source code to Basescan...');

    const formData = new URLSearchParams({
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: CONTRACT_ADDRESS,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: 'Groth16Verifier',
        compilerversion: COMPILER_VERSION,
        optimizationUsed: '0',
        runs: '200',
        constructorArguements: '',
        licenseType: '5', // GPL-3.0
        apikey: apiKey
    });

    const submitResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    const submitData = await submitResponse.json();
    console.log('Response:', JSON.stringify(submitData, null, 2));

    if (submitData.status !== '1') {
        throw new Error(`Verification submission failed: ${submitData.result}`);
    }

    const guid = submitData.result;
    console.log(`✅ Submission successful! GUID: ${guid}\n`);

    // Step 2: Poll for result
    console.log('⏳ Step 2: Waiting for verification (this takes 10-30 seconds)...');

    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

        const statusResponse = await fetch(
            `${API_URL}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`
        );

        const statusData = await statusResponse.json();
        console.log(`   Check ${i + 1}/10: ${statusData.result}`);

        if (statusData.result.includes('Pass')) {
            console.log('\n🎉 CONTRACT VERIFIED SUCCESSFULLY!\n');
            console.log('✅ Source code is now published on Basescan');
            console.log(`🔗 View at: https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}#code`);
            console.log('\n✨ Features now available:');
            console.log('   - Source code visible on explorer');
            console.log('   - Read/Write contract tabs enabled');
            console.log('   - Function signatures readable');
            console.log('   - Green checkmark on contract page');
            return true;
        } else if (statusData.result.includes('Fail')) {
            throw new Error(`Verification failed: ${statusData.result}`);
        }
    }

    console.log('\n⏰ Verification is taking longer than expected');
    console.log('   Check status manually: https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}');
    return false;
}

// Main execution
async function main() {
    // Check for API key in environment
    let apiKey = process.env.BASESCAN_API_KEY;

    if (!apiKey) {
        console.log('⚠️  No BASESCAN_API_KEY found in environment\n');
        console.log('To get a FREE API key (takes 2 minutes):');
        console.log('1. Register: https://basescan.org/register');
        console.log('2. Get API key: https://basescan.org/myapikey');
        console.log('3. Run: export BASESCAN_API_KEY=your_key_here');
        console.log('4. Run: node verify-contract-automated.js\n');
        console.log('Or provide as argument: node verify-contract-automated.js YOUR_KEY\n');

        // Check if provided as argument
        if (process.argv[2]) {
            apiKey = process.argv[2];
            console.log('✅ Using API key from command line argument\n');
        } else {
            process.exit(1);
        }
    } else {
        console.log(`✅ Using API key from environment: ${apiKey.substring(0, 8)}...\n`);
    }

    try {
        await verifyContract(apiKey);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check API key is valid');
        console.error('   - Try again in a few minutes');
        console.error('   - Use manual verification as fallback');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { verifyContract };
