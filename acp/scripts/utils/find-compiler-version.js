#!/usr/bin/env node

const { ethers } = require('ethers');

async function findCompilerVersion() {
    const CONTRACT_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

    console.log('🔍 Analyzing deployed contract bytecode...\n');

    // Get the bytecode
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);

    console.log('📦 Deployed Bytecode Info:');
    console.log('   Length:', bytecode.length, 'characters');
    console.log('   First 50 chars:', bytecode.substring(0, 50));
    console.log('   Last 50 chars:', bytecode.substring(bytecode.length - 50));
    console.log();

    // Check for metadata hash (IPFS/Swarm)
    const metadataMatch = bytecode.match(/a264697066735822[0-9a-f]{68}/i);
    if (metadataMatch) {
        console.log('✅ Found IPFS metadata hash');
        console.log('   This helps identify the compiler version');
        console.log();
    }

    // Check for constructor pattern (helps identify compiler)
    const constructorPattern = bytecode.substring(0, 20);
    console.log('🔧 Bytecode signature:', constructorPattern);
    console.log();

    // Common Solidity versions and their patterns
    const versionPatterns = {
        '0.8.17': '6080604052348015600e575f5ffd',
        '0.8.11': '608060405234801561001057600080',
        '0.8.0': '608060405234801561001057600080',
        '0.7.6': '608060405234801561001057600080',
        '0.6.12': '608060405234801561001057600080'
    };

    console.log('📊 Compiler Version Detection:');
    let likelyVersion = null;
    for (const [version, pattern] of Object.entries(versionPatterns)) {
        if (bytecode.startsWith(pattern)) {
            console.log(`   ✅ Match: Solidity ${version}`);
            likelyVersion = version;
        } else {
            console.log(`   ❌ Not: Solidity ${version}`);
        }
    }
    console.log();

    // The actual bytecode prefix from Basescan error
    const deployedPrefix = '608060405234801561001057600080fd5b5061063c80';

    if (bytecode.startsWith('0x' + deployedPrefix)) {
        console.log('🎯 Exact Match Found!');
        console.log('   Deployed bytecode matches the pattern from Basescan error');
        console.log();
        console.log('💡 Recommended Compiler Versions to try:');
        console.log('   1. v0.8.11+commit.d7f03943 (common for snarkjs)');
        console.log('   2. v0.8.4+commit.c7e474f2 (older snarkjs default)');
        console.log('   3. v0.8.0+commit.c7dfd78e (original 0.8 release)');
        console.log('   4. v0.7.6+commit.7338295f (if generated with older snarkjs)');
    } else {
        console.log('⚠️  Bytecode pattern not in our database');
        console.log('   The contract might be compiled with:');
        console.log('   - Custom optimization settings');
        console.log('   - Via-IR compilation');
        console.log('   - Non-standard toolchain');
    }
    console.log();

    console.log('📋 Next Steps:');
    console.log('1. Try manual verification with these versions in order');
    console.log('2. Use the verify-helper page: http://localhost:9000/verify-helper.html');
    console.log('3. On Basescan, try compiler versions:');
    console.log('   - v0.8.11+commit.d7f03943');
    console.log('   - v0.8.4+commit.c7e474f2');
    console.log('   - v0.8.0+commit.c7dfd78e');
}

findCompilerVersion().catch(console.error);
