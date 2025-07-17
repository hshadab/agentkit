#!/usr/bin/env node

// Test simple workflows without blockchain verification
const http = require('http');

// Test workflows
const testWorkflows = [
    {
        name: "Simple KYC Transfer",
        command: "Generate KYC proof then send 0.1 USDC to Alice"
    },
    {
        name: "Location Proof Transfer",
        command: "Generate location proof for Bob, verify it, then transfer 0.05 USDC to Bob on Solana"
    },
    {
        name: "AI Content Verification",
        command: "Generate AI content proof, verify it, then send 0.2 USDC to Charlie"
    },
    {
        name: "Conditional Transfer",
        command: "If David is KYC verified, send him 0.15 USDC"
    },
    {
        name: "Multiple Transfers",
        command: "Send 0.06 USDC to Alice on Ethereum if KYC compliant and Send 0.07 USDC to Bob on Solana if KYC compliant"
    }
];

// Function to test OpenAI parser
async function testParser(command) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ command });
        
        const options = {
            hostname: 'localhost',
            port: 8002,
            path: '/test_parser',
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
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.write(data);
        req.end();
    });
}

// Main test function
async function runTests() {
    console.log('Testing Simple Workflows (without blockchain verification)');
    console.log('='.repeat(80));
    
    // Check if server is running
    try {
        await testParser("test");
        console.log('✓ Server is running\n');
    } catch (e) {
        console.error('✗ Server not responding. Please start the server on port 8002');
        process.exit(1);
    }
    
    // Run all tests
    for (let i = 0; i < testWorkflows.length; i++) {
        const workflow = testWorkflows[i];
        console.log(`\n[${i+1}/${testWorkflows.length}] Testing: ${workflow.name}`);
        console.log(`Command: ${workflow.command}`);
        
        try {
            // First test the parser
            console.log('\nParser output:');
            const parseResult = await testParser(workflow.command);
            if (parseResult.success && parseResult.parsed_result && parseResult.parsed_result.steps) {
                parseResult.parsed_result.steps.forEach((step, idx) => {
                    console.log(`  ${idx + 1}. ${step.type}: ${step.description}`);
                });
                
                // Check for blockchain verification steps
                const hasBlockchainVerify = parseResult.parsed_result.steps.some(
                    step => step.type === 'verify_on_ethereum' || step.type === 'verify_on_solana'
                );
                if (hasBlockchainVerify) {
                    console.log('  ⚠️  Warning: Blockchain verification steps detected in simple workflow');
                }
            }
            
            // Then execute the workflow
            console.log('\nExecuting workflow...');
            const result = await executeWorkflow(workflow);
            
            console.log('='.repeat(80));
            console.log(`Test: ${workflow.name}`);
            console.log('='.repeat(80));
            
            if (result.success) {
                console.log(`✅ Workflow executed successfully!`);
                if (result.transferIds && result.transferIds.length > 0) {
                    console.log(`Transfers: ${result.transferIds.length}`);
                    result.transferIds.forEach(id => console.log(`  - ${id}`));
                }
                if (result.proofSummary) {
                    console.log('Proofs generated:');
                    Object.entries(result.proofSummary).forEach(([type, info]) => {
                        console.log(`  - ${type}: ${info.status} (${info.proofId})`);
                    });
                }
            } else {
                console.log(`❌ Workflow failed: ${result.error || 'Unknown error'}`);
                if (result.details) {
                    console.log(`Details: ${result.details}`);
                }
            }
            
        } catch (error) {
            console.log('='.repeat(80));
            console.log(`Test: ${workflow.name}`);
            console.log('='.repeat(80));
            console.log(`❌ Test failed with error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);