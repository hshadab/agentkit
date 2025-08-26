const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Simple Base Sepolia Deployment");
  console.log("=================================");
  
  // Check for private key
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY not found in .env file");
    process.exit(1);
  }
  
  // Connect to Base Sepolia
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("Deploying with account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ Error: No ETH balance. Please fund your wallet with Base Sepolia ETH");
    process.exit(1);
  }
  
  // Read the compiled contract
  const contractPath = path.join(__dirname, "artifacts/contracts/RealProofOfProofVerifier.sol/Groth16Verifier.json");
  
  if (!fs.existsSync(contractPath)) {
    console.error("❌ Error: Contract not compiled. Run: npx hardhat compile");
    process.exit(1);
  }
  
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;
  
  console.log("📝 Deploying contract...");
  
  // Deploy the contract
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await contractFactory.deploy();
  
  console.log("⏳ Waiting for deployment...");
  console.log("Transaction hash:", contract.deploymentTransaction().hash);
  
  // Wait for deployment
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("✅ Groth16Verifier deployed to:", address);
  console.log("🔗 View on BaseScan: https://sepolia.basescan.org/address/" + address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "Base Sepolia",
    chainId: 84532,
    contractAddress: address,
    deploymentTime: new Date().toISOString(),
    deployer: wallet.address,
    transactionHash: contract.deploymentTransaction().hash
  };
  
  fs.writeFileSync(
    path.join(__dirname, "deployment-base.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📄 Deployment info saved to deployment-base.json");
  
  // Update base-verifier.js
  console.log("\n🔧 Updating base-verifier.js with new contract address...");
  
  const baseVerifierPath = path.join(__dirname, "static/base-verifier.js");
  let baseVerifierContent = fs.readFileSync(baseVerifierPath, "utf8");
  
  // Replace the placeholder address
  baseVerifierContent = baseVerifierContent.replace(
    /84532: ['"]0x[0-9a-fA-F.]*['"],/,
    `84532: '${address}',`
  );
  
  fs.writeFileSync(baseVerifierPath, baseVerifierContent);
  console.log("✅ base-verifier.js updated!");
  
  console.log("\n🎉 Deployment complete!");
  console.log("Contract address:", address);
  console.log("\nNext steps:");
  console.log("1. Refresh your zkEngine UI");
  console.log("2. Test Base verification with any proof");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });