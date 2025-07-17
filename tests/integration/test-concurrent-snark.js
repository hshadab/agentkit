#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

// Test concurrent SNARK generation
async function testConcurrentSNARK() {
    console.log('Testing concurrent SNARK generation...\n');
    
    // Use the existing snark_input.json
    const inputFile = '/home/hshadab/agentkit/proofs/proof_location_1752602338965/snark_input.json';
    
    if (!fs.existsSync(inputFile)) {
        console.error('Input file not found:', inputFile);
        return;
    }
    
    // Spawn 3 concurrent SNARK generation processes
    const promises = [];
    for (let i = 0; i < 3; i++) {
        promises.push(spawnSNARKProcess(i, inputFile));
    }
    
    // Wait for all to complete
    const results = await Promise.all(promises);
    
    console.log('\nResults:');
    results.forEach((result, i) => {
        console.log(`Process ${i}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration}ms)`);
        if (!result.success) {
            console.log(`  Error: ${result.error}`);
        }
    });
}

function spawnSNARKProcess(id, inputFile) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        console.log(`[Process ${id}] Starting SNARK generation...`);
        
        const proc = spawn('node', ['src/generate_snark_proof.js', inputFile], {
            cwd: '/home/hshadab/agentkit',
            timeout: 30000 // 30 second timeout
        });
        
        let stdout = '';
        let stderr = '';
        let completed = false;
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('exit', (code, signal) => {
            if (completed) return;
            completed = true;
            
            const duration = Date.now() - startTime;
            console.log(`[Process ${id}] Exited with code ${code} after ${duration}ms`);
            
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    resolve({ success: true, duration, result });
                } catch (e) {
                    resolve({ success: false, duration, error: 'Failed to parse output: ' + e.message });
                }
            } else {
                resolve({ 
                    success: false, 
                    duration, 
                    error: signal ? `Killed by signal ${signal}` : `Exit code ${code}`,
                    stderr: stderr.substring(0, 500)
                });
            }
        });
        
        proc.on('error', (error) => {
            if (completed) return;
            completed = true;
            
            const duration = Date.now() - startTime;
            console.log(`[Process ${id}] Error after ${duration}ms: ${error.message}`);
            resolve({ success: false, duration, error: error.message });
        });
        
        // Kill if still running after timeout
        setTimeout(() => {
            if (!completed) {
                console.log(`[Process ${id}] Killing due to timeout...`);
                proc.kill('SIGKILL');
            }
        }, 30000);
    });
}

testConcurrentSNARK().catch(console.error);