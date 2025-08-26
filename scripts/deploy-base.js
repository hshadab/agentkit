const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Groth16Verifier to Base Sepolia...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance.eq(0)) {
    console.error("❌ Error: No ETH balance. Please fund your wallet with Base Sepolia ETH");
    process.exit(1);
  }
  
  try {
    // Get the contract factory
    const Groth16Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    
    console.log("📝 Deploying contract...");
    const verifier = await Groth16Verifier.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await verifier.deployed();
    
    console.log("✅ Groth16Verifier deployed to:", verifier.address);
    console.log("🔗 View on BaseScan: https://sepolia.basescan.org/address/" + verifier.address);
    
    // Save the contract address
    const deploymentInfo = {
      network: "Base Sepolia",
      chainId: 84532,
      contractAddress: verifier.address,
      deploymentTime: new Date().toISOString(),
      deployer: deployer.address,
      transactionHash: verifier.deployTransaction.hash
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../deployment-base.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📄 Deployment info saved to deployment-base.json");
    
    // Update base-verifier.js automatically
    console.log("\n🔧 Updating base-verifier.js with new contract address...");
    
    const baseVerifierPath = path.join(__dirname, "../static/base-verifier.js");
    let baseVerifierContent = fs.readFileSync(baseVerifierPath, "utf8");
    
    // Replace the placeholder address
    baseVerifierContent = baseVerifierContent.replace(
      /84532: ['"]0x[0-9a-fA-F]*['"],/,
      `84532: '${verifier.address}',`
    );
    
    fs.writeFileSync(baseVerifierPath, baseVerifierContent);
    console.log("✅ base-verifier.js updated!");
    
    console.log("\n🎉 Deployment complete! Next steps:");
    console.log("1. The contract address has been automatically updated in base-verifier.js");
    console.log("2. Refresh your zkEngine UI");
    console.log("3. Test Base verification with any proof");
    
    // Optional: Verify contract on BaseScan
    console.log("\n📋 To verify on BaseScan (optional):");
    console.log(`npx hardhat verify --network baseSepolia ${verifier.address}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });