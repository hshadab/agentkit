#!/usr/bin/env node

// Test complex blockchain workflows
const http = require('http');

// Test workflows
const testWorkflows = [
    {
        name: "Basic Ethereum Verification",
        command: "Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum"
    },
    {
        name: "Solana Verification",
        command: "Generate location proof, verify it on Solana, then transfer 0.05 USDC to Bob on SOL"
    },
    {
        name: "Conditional On-Chain Transfer",
        command: "If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum"
    },
    {
        name: "Multi-Chain Verification",
        command: "Generate AI content proof, verify locally, verify on Ethereum, verify on Solana, then send 0.15 USDC to David"
    },
    {
        name: "Multiple Conditions",
        command: "If Frank is KYC compliant and verified on Ethereum, send him 0.25 USDC, and if Grace is location verified on Solana, send her 0.15 USDC on SOL"
    }
];

// Function to execute a workflow
async function executeWorkflow(workflow) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ command: workflow.command });
        
        const options = {
            hostname: 'localhost',
            port: 8002,
            path: '/execute_workflow',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 60000 // 60 second timeout
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
                    reject(new Error('Failed to parse response: ' + e.message));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.write(data);
        req.end();
    });
}

// Function to print workflow result
function printWorkflowResult(name, result) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test: ${name}`);
    console.log('='.repeat(80));
    
    if (result.success) {
        console.log('✅ Workflow completed successfully!');
        
        // Print proof summary
        if (result.proofSummary) {
            console.log('\nProof Summary:');
            for (const [proofType, info] of Object.entries(result.proofSummary)) {
                console.log(`  - ${proofType}: ${info.status} (ID: ${info.proofId})`);
            }
        }
        
        // Print transfer IDs
        if (result.transferIds && result.transferIds.length > 0) {
            console.log('\nTransfers:');
            result.transferIds.forEach(id => {
                console.log(`  - Transfer ID: ${id}`);
            });
        }
        
        // Count blockchain verification steps
        if (result.stepResults) {
            const blockchainSteps = result.stepResults.filter(step => 
                step.type === 'verify_on_ethereum' || step.type === 'verify_on_solana'
            );
            
            if (blockchainSteps.length > 0) {
                console.log('\nBlockchain Verifications:');
                blockchainSteps.forEach(step => {
                    const chain = step.type.split('_').pop();
                    console.log(`  - ${chain.toUpperCase()}: ${step.status}`);
                });
            }
        }
    } else {
        console.log(`❌ Workflow failed: ${result.error || 'Unknown error'}`);
    }
}

// Main test function
async function runTests() {
    console.log('Testing Complex Blockchain Verification Workflows');
    console.log('='.repeat(80));
    
    // Check server
    try {
        await new Promise((resolve, reject) => {
            http.get('http://localhost:8002/docs', (res) => {
                if (res.statusCode === 200 || res.statusCode === 404) {
                    resolve(); // Server is responding
                } else {
                    reject(new Error('Server returned ' + res.statusCode));
                }
            }).on('error', reject);
        });
        console.log('✓ Server is running\n');
    } catch (e) {
        console.error('❌ Server not running. Please start with: python3 chat_service.py');
        process.exit(1);
    }
    
    // Run tests
    for (let i = 0; i < testWorkflows.length; i++) {
        const workflow = testWorkflows[i];
        console.log(`\n[${i + 1}/${testWorkflows.length}] Testing: ${workflow.name}`);
        console.log(`Command: ${workflow.command}`);
        
        try {
            const result = await executeWorkflow(workflow);
            printWorkflowResult(workflow.name, result);
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
        
        // Wait between tests
        if (i < testWorkflows.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);