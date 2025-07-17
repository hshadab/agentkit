import OnChainAwareWorkflowParser from './parsers/workflow/workflowParser_onchain.js';
import OnChainAwareWorkflowExecutor from './parsers/workflow/workflowExecutor_onchain.js';

async function testWorkflow(prompt, description) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${description}`);
    console.log(`${'='.repeat(80)}`);
    
    const parser = new OnChainAwareWorkflowParser();
    const executor = new OnChainAwareWorkflowExecutor();
    
    console.log("Prompt:", prompt);
    console.log("\n=== PARSING ===");
    
    try {
        // Parse the workflow
        const workflow = parser.parseCommand(prompt);
        console.log("\nParsed steps:");
        workflow.steps.forEach((step, i) => {
            console.log(`${i + 1}. ${step.type}: ${step.description}`);
        });
        
        console.log("\n=== EXECUTION PREVIEW ===");
        console.log("This workflow would:");
        
        let hasProofGeneration = false;
        let hasVerification = false;
        let hasOnChainCheck = false;
        
        workflow.steps.forEach(step => {
            if (step.type.includes('_proof')) {
                hasProofGeneration = true;
                console.log(`  ✓ Generate a new ${step.proofType} proof`);
            }
            if (step.type === 'verification') {
                hasVerification = true;
                console.log(`  ✓ Verify the proof on-chain`);
            }
            if (step.type === 'check_verification') {
                hasOnChainCheck = true;
                console.log(`  ✓ Check existing ${step.verificationType} verification on ${step.blockchain}`);
            }
            if (step.type === 'transfer') {
                console.log(`  ✓ Transfer ${step.amount} USDC to ${step.recipient} on ${step.blockchain}`);
            }
        });
        
        console.log("\nAnalysis:");
        console.log(`  Generates new proofs: ${hasProofGeneration ? 'YES' : 'NO'}`);
        console.log(`  Verifies proofs on-chain: ${hasVerification ? 'YES' : 'NO'}`);
        console.log(`  Checks existing verifications: ${hasOnChainCheck ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function runAllTests() {
    // Test 1: Check existing verification only
    await testWorkflow(
        "Send 0.05 USDC on Solana if Bob is KYC verified on Solana",
        "Check existing verification (should NOT generate proofs)"
    );
    
    // Test 2: Generate proof then verify and send
    await testWorkflow(
        "Generate KYC proof for Bob and verify on Solana, then send 0.05 USDC on Solana",
        "Generate new proof, verify, then send"
    );
    
    // Test 3: Alternative wording for proof generation
    await testWorkflow(
        "Create KYC verification for Bob on Solana then transfer 0.05 USDC to him",
        "Create verification (should generate proof)"
    );
    
    // Test 4: Mixed scenario
    await testWorkflow(
        "Generate KYC proof for Bob and verify on Solana, then send 0.05 USDC on Solana, and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum",
        "Mixed: Generate for Bob, check existing for Alice"
    );
}

// Run all tests
runAllTests().catch(console.error);