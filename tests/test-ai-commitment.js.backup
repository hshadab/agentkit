// Test script for AI Prediction Commitment with real Base transaction
const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function testAICommitment() {
  console.log("🧪 Testing AI Prediction Commitment on Base Sepolia");
  console.log("================================================\n");

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-ai-commitment-base.json", "utf8"));
  const contractAddress = deploymentInfo.contractAddress;
  const contractABI = deploymentInfo.abi;
  
  console.log("📍 Contract address:", contractAddress);
  console.log("🔗 View on BaseScan: https://sepolia.basescan.org/address/" + contractAddress);
  
  // Connect to Base Sepolia
  const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  // Simulate AI prediction
  const prompt = "Will it rain tomorrow in San Francisco?";
  const aiResponse = "Based on current weather patterns, there's a 65% chance of rain tomorrow in San Francisco.";
  const nonce = ethers.hexlify(ethers.randomBytes(16));
  
  console.log("\n📝 AI Prediction Details:");
  console.log("Prompt:", prompt);
  console.log("AI Response:", aiResponse);
  console.log("Nonce:", nonce);
  
  // Create hashes
  const promptHash = ethers.keccak256(ethers.toUtf8Bytes(prompt + nonce));
  const responseHash = ethers.keccak256(ethers.toUtf8Bytes(aiResponse + nonce));
  
  console.log("\n🔐 Hashes:");
  console.log("Prompt hash:", promptHash);
  console.log("Response hash:", responseHash);
  
  try {
    // Send commitment to blockchain
    console.log("\n📤 Sending commitment to Base blockchain...");
    const tx = await contract.commitPrediction(promptHash, responseHash);
    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the commitment ID from events
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === "PredictionCommitted";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      const commitmentId = parsedEvent.args.commitmentId;
      console.log("📋 Commitment ID:", commitmentId);
      
      // Query the commitment from blockchain
      console.log("\n🔍 Querying commitment from blockchain...");
      const commitment = await contract.getCommitment(commitmentId);
      
      console.log("Stored commitment:");
      console.log("  - Prompt hash:", commitment[0]);
      console.log("  - Response hash:", commitment[1]);
      console.log("  - Block number:", commitment[2].toString());
      console.log("  - Timestamp:", new Date(Number(commitment[3]) * 1000).toLocaleString());
      console.log("  - Predictor:", commitment[4]);
      console.log("  - Revealed:", commitment[5]);
      
      // Verify temporal ordering
      const isValid = await contract.verifyTemporalOrdering(commitmentId);
      console.log("  - Temporal ordering valid:", isValid);
    }
    
    // Check final balance
    const finalBalance = await provider.getBalance(wallet.address);
    console.log("\n💰 Final balance:", ethers.formatEther(finalBalance), "ETH");
    
    console.log("\n🎉 Test completed successfully!");
    console.log("🔗 View transaction: https://sepolia.basescan.org/tx/" + tx.hash);
    
    // Save test results
    const testResults = {
      testTime: new Date().toISOString(),
      contractAddress,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      commitmentId: event ? contract.interface.parseLog(event).args.commitmentId : null,
      prompt,
      aiResponse,
      nonce,
      promptHash,
      responseHash
    };
    
    fs.writeFileSync("test-ai-commitment-results.json", JSON.stringify(testResults, null, 2));
    console.log("\n📄 Test results saved to test-ai-commitment-results.json");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.transaction) {
      console.error("Transaction data:", error.transaction);
    }
  }
}

testAICommitment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });