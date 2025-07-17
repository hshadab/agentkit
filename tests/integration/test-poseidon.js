#!/usr/bin/env node

console.log('Starting Poseidon test...');

async function testPoseidon() {
    try {
        console.log('Loading circomlibjs...');
        const { buildPoseidon } = require("circomlibjs");
        
        console.log('Building Poseidon...');
        const startTime = Date.now();
        const poseidon = await buildPoseidon();
        console.log(`Poseidon built in ${Date.now() - startTime}ms`);
        
        // Test hash
        const hash = poseidon.F.toString(poseidon([1, 2]));
        console.log('Test hash:', hash);
        
        console.log('SUCCESS');
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
    }
}

testPoseidon();