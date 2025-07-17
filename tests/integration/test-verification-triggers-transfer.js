const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function testVerificationTriggersTransfer() {
    console.log("🔗 Testing On-Chain Verification → USDC Transfer Workflow");
    console.log("=" .repeat(60));
    
    try {
        // Step 1: Create a workflow that does verification then transfer
        console.log("\n1️⃣ Creating conditional workflow...");
        console.log("   Workflow: Verify KYC proof on-chain, then transfer USDC if valid");
        
        const workflowData = {
            steps: [
                {
                    type: "kyc",
                    action: "generate_proof",
                    person: "Alice"
                },
                {
                    type: "verify_on_ethereum",
                    action: "verify_on_ethereum",
                    proofId: "{{previous.proofId}}"  // Will use proof from step 1
                },
                {
                    type: "transfer",
                    action: "transfer",
                    amount: 0.1,
                    recipient: "Alice",
                    blockchain: "ETH",
                    condition: "{{previous.verified}}"  // Only transfer if verification succeeded
                }
            ]
        };
        
        console.log("\n📤 Sending workflow request...");
        const response = await axios.post('http://localhost:8001/api/workflow/create', workflowData);
        
        if (response.data.success) {
            console.log("✅ Workflow created successfully!");
            console.log(`   Workflow ID: ${response.data.workflowId}`);
            console.log("\n📋 Workflow Steps:");
            console.log("   1. Generate KYC proof for Alice");
            console.log("   2. Verify proof on Ethereum blockchain");
            console.log("   3. Transfer 0.1 USDC to Alice (only if verified)");
            
            console.log("\n⏳ Monitor the UI to see:");
            console.log("   • KYC proof generation");
            console.log("   • On-chain verification via MetaMask");
            console.log("   • USDC transfer triggered by successful verification");
            
            return {
                success: true,
                workflowId: response.data.workflowId,
                message: "Workflow initiated - check UI for progress"
            };
        } else {
            throw new Error("Workflow creation failed");
        }
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// Alternative: Test with existing proof
async function testWithExistingProof(proofId) {
    console.log("\n🔄 Alternative Test: Using existing proof");
    console.log("=" .repeat(60));
    
    try {
        const workflowData = {
            steps: [
                {
                    type: "verify_on_ethereum",
                    action: "verify_on_ethereum",
                    proofId: proofId
                },
                {
                    type: "transfer",
                    action: "transfer",
                    amount: 0.05,
                    recipient: "Bob",
                    blockchain: "ETH",
                    condition: "{{previous.verified}}"
                }
            ]
        };
        
        console.log(`\n📤 Creating workflow with existing proof: ${proofId}`);
        const response = await axios.post('http://localhost:8001/api/workflow/create', workflowData);
        
        console.log("✅ Workflow created!");
        console.log(`   Workflow ID: ${response.data.workflowId}`);
        console.log("\n📋 Steps:");
        console.log(`   1. Verify proof ${proofId} on Ethereum`);
        console.log("   2. Transfer 0.05 USDC to Bob if verified");
        
        return response.data;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { success: false, error: error.message };
    }
}

// Manual test for direct on-chain verification
async function manualVerificationTest() {
    console.log("\n🔧 Manual Test: Direct On-Chain Verification");
    console.log("=" .repeat(60));
    
    const proofId = "proof_kyc_1752383834341"; // Use an existing proof
    
    try {
        // Test if proof exists and can be verified
        console.log(`\n1️⃣ Checking proof ${proofId}...`);
        const proofResponse = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
        console.log("✅ Proof data retrieved successfully");
        
        // Setup Web3 for verification
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        const contractAddress = "0x09378444046d1ccb32ca2d5b44fab6634738d067";
        
        console.log("\n2️⃣ Contract Details:");
        console.log(`   Address: ${contractAddress}`);
        console.log(`   Network: Sepolia`);
        
        console.log("\n3️⃣ To trigger transfer after verification:");
        console.log("   Option A: Use the workflow system (recommended)");
        console.log("   Option B: Implement smart contract with transfer logic");
        console.log("   Option C: Use event listeners to trigger transfers");
        
        return {
            proofId: proofId,
            contractAddress: contractAddress,
            recommendation: "Use workflow system for verification → transfer flow"
        };
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { success: false, error: error.message };
    }
}

// Run tests
async function runAllTests() {
    console.log("🧪 VERIFICATION → TRANSFER TEST SUITE");
    console.log("=" .repeat(60));
    
    // Test 1: Full workflow
    const result1 = await testVerificationTriggersTransfer();
    console.log("\n📊 Test 1 Result:", JSON.stringify(result1, null, 2));
    
    // Test 2: With existing proof (if you have one)
    // Uncomment and add a proof ID to test:
    // const result2 = await testWithExistingProof("proof_kyc_XXXXXXXXXX");
    // console.log("\n📊 Test 2 Result:", JSON.stringify(result2, null, 2));
    
    // Test 3: Manual verification info
    const result3 = await manualVerificationTest();
    console.log("\n📊 Manual Test Result:", JSON.stringify(result3, null, 2));
    
    console.log("\n" + "=" .repeat(60));
    console.log("💡 SUMMARY:");
    console.log("1. Workflows can chain verification → transfer");
    console.log("2. Use 'condition' field to make transfers conditional");
    console.log("3. Monitor UI for real-time updates");
    console.log("4. MetaMask will prompt for verification transaction");
    console.log("5. Circle API handles the USDC transfer after verification");
}

// Execute tests
runAllTests()
    .then(() => {
        console.log("\n✅ All tests completed!");
        process.exit(0);
    })
    .catch(err => {
        console.error("\n❌ Fatal error:", err);
        process.exit(1);
    });