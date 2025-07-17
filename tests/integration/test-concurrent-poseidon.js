#!/usr/bin/env node

const { spawn } = require('child_process');
const { fork } = require('child_process');

console.log('Testing concurrent Poseidon initialization...\n');

// Create a worker script
const workerCode = `
console.error('[Worker ' + process.argv[2] + '] Starting...');
const { buildPoseidon } = require("circomlibjs");

async function init() {
    const startTime = Date.now();
    console.error('[Worker ' + process.argv[2] + '] Building Poseidon...');
    const poseidon = await buildPoseidon();
    console.error('[Worker ' + process.argv[2] + '] Poseidon built in ' + (Date.now() - startTime) + 'ms');
    process.exit(0);
}

init().catch(err => {
    console.error('[Worker ' + process.argv[2] + '] Error:', err.message);
    process.exit(1);
});
`;

// Write worker script
const fs = require('fs');
fs.writeFileSync('/tmp/poseidon-worker.js', workerCode);

// Spawn 3 workers
const promises = [];
for (let i = 0; i < 3; i++) {
    promises.push(new Promise((resolve) => {
        const startTime = Date.now();
        const proc = spawn('node', ['/tmp/poseidon-worker.js', i.toString()], {
            cwd: '/home/hshadab/agentkit'
        });
        
        let stderr = '';
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
            process.stderr.write(data);
        });
        
        proc.on('exit', (code) => {
            const duration = Date.now() - startTime;
            resolve({ id: i, success: code === 0, duration, stderr });
        });
    }));
}

Promise.all(promises).then(results => {
    console.log('\nResults:');
    results.forEach(r => {
        console.log(`Worker ${r.id}: ${r.success ? 'SUCCESS' : 'FAILED'} (${r.duration}ms)`);
    });
});