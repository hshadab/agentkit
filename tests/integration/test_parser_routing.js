#!/usr/bin/env node

// Test to check if blockchain commands are routed through OpenAI parser
const http = require('http');

// Test commands to check routing
const testCommands = [
    "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice",
    "If Bob is verified on-chain, send him 0.05 USDC",
    "Generate location proof and verify on Solana",
    "Simple KYC proof generation", // This should use regex parser
];

async function checkRouting(command) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ message: command });
        
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('Testing Parser Routing for Blockchain Commands');
    console.log('='.repeat(60));
    
    for (const command of testCommands) {
        console.log(`\nCommand: "${command}"`);
        
        try {
            const result = await checkRouting(command);
            console.log(`Intent: ${result.intent}`);
            
            if (result.intent === 'workflow_executed') {
                console.log('✓ Recognized as workflow and executed');
                // Check if it used OpenAI parser
                if (result.workflow_result && result.workflow_result.executionLog) {
                    if (result.workflow_result.executionLog.includes('OpenAI parser')) {
                        console.log('✓ Used OpenAI parser');
                    }
                }
            } else {
                console.log(`→ Routed to: ${result.intent}`);
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

main().catch(console.error);