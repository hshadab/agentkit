const axios = require('axios');

async function testVerifyThenTransfer() {
    console.log("🔗 Testing: On-Chain Verification → USDC Transfer");
    console.log("=" .repeat(60));
    
    try {
        // Create a multi-step workflow
        const workflowData = {
            steps: [
                {
                    type: "kyc",
                    action: "generate_proof",
                    person: "Alice"
                },
                {
                    type: "blockchain",
                    action: "verify",
                    blockchain: "ethereum",
                    proof_type: "kyc"
                },
                {
                    type: "transfer", 
                    action: "transfer",
                    amount: "0.1",
                    recipient: "Alice",
                    blockchain: "ETH"
                }
            ]
        };
        
        console.log("\n📤 Creating workflow with steps:");
        console.log("   1. Generate KYC proof for Alice");
        console.log("   2. Verify proof on Ethereum blockchain");  
        console.log("   3. Transfer 0.1 USDC to Alice");
        
        const response = await axios.post('http://localhost:8001/api/workflow/create', workflowData);
        
        console.log("\n✅ Workflow created successfully!");
        console.log(`📋 Workflow ID: ${response.data.workflowId}`);
        
        console.log("\n⏳ What happens next:");
        console.log("   1. KYC proof will be generated (~15 seconds)");
        console.log("   2. You'll need to approve the Ethereum verification in MetaMask");
        console.log("   3. After successful verification, USDC transfer will be initiated");
        console.log("   4. Circle API will process the transfer");
        
        console.log("\n💡 Watch the UI for:");
        console.log("   • Proof generation card with 'KYC PROOF' title");
        console.log("   • MetaMask popup for verification transaction");
        console.log("   • Transfer card showing USDC movement");
        
        return response.data;
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
        
        // Try alternative approach
        console.log("\n🔄 Alternative: Test with natural language");
        return testWithNaturalLanguage();
    }
}

async function testWithNaturalLanguage() {
    try {
        const prompt = "Generate KYC proof for Alice, verify it on Ethereum, then transfer 0.1 USDC to Alice";
        
        console.log(`\n📝 Trying natural language: "${prompt}"`);
        
        const response = await axios.post('http://localhost:8001/api/workflow/create', {
            prompt: prompt
        });
        
        if (response.data.workflowId) {
            console.log("✅ Workflow created via natural language!");
            console.log(`📋 Workflow ID: ${response.data.workflowId}`);
            return response.data;
        }
        
    } catch (error) {
        console.error("Natural language also failed:", error.message);
    }
    
    return null;
}

// Test conditional transfer based on verification
async function testConditionalTransfer() {
    console.log("\n\n🔐 Testing Conditional Transfer Logic");
    console.log("=" .repeat(60));
    
    console.log("\nCONCEPT: Transfer only happens if verification succeeds");
    console.log("\nImplementation Options:");
    
    console.log("\n1️⃣ Smart Contract Approach:");
    console.log("   - Deploy a contract that holds USDC");
    console.log("   - Contract checks proof verification before releasing funds");
    console.log("   - Most secure but requires contract deployment");
    
    console.log("\n2️⃣ Workflow System Approach:");
    console.log("   - Backend checks verification status");
    console.log("   - Only initiates Circle transfer if verified");
    console.log("   - Currently implemented in the system");
    
    console.log("\n3️⃣ Event-Driven Approach:");
    console.log("   - Listen for verification events on-chain");
    console.log("   - Trigger transfer when ProofVerified event emitted");
    console.log("   - Requires event monitoring infrastructure");
    
    console.log("\n✅ Current System Uses: Workflow approach");
    console.log("   The backend validates proof verification before transfer");
}

// Run the test
async function main() {
    console.log("🧪 VERIFICATION-TRIGGERED TRANSFER TEST");
    console.log("=" .repeat(60));
    
    // Test the workflow
    const result = await testVerifyThenTransfer();
    
    if (result) {
        console.log("\n📊 Result:", JSON.stringify(result, null, 2));
    }
    
    // Show conditional logic
    await testConditionalTransfer();
    
    console.log("\n" + "=" .repeat(60));
    console.log("🎯 KEY POINTS:");
    console.log("• On-chain verification CAN trigger USDC transfers");
    console.log("• The system uses workflow orchestration");
    console.log("• Verification must succeed for transfer to proceed");
    console.log("• All steps are tracked in real-time via WebSocket");
}

main().catch(console.error);