const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of SimplifiedZKVerifierV2 to Sepolia testnet...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  // Deploy SimplifiedZKVerifierV2
  console.log("\nDeploying SimplifiedZKVerifierV2 (more lenient for demos)...");
  const SimplifiedZKVerifierV2 = await hre.ethers.getContractFactory("SimplifiedZKVerifierV2");
  const verifier = await SimplifiedZKVerifierV2.deploy();
  
  // Wait for deployment
  await verifier.waitForDeployment();
  const contractAddress = await verifier.getAddress();
  
  console.log("SimplifiedZKVerifierV2 deployed to:", contractAddress);
  console.log("Transaction hash:", verifier.deploymentTransaction().hash);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + contractAddress);
  
  // Update ethereum-verifier.js automatically
  const verifierPath = path.join(__dirname, "..", "static", "ethereum-verifier.js");
  let verifierContent = fs.readFileSync(verifierPath, 'utf8');
  
  // Replace the Sepolia address
  verifierContent = verifierContent.replace(
    /11155111: '[^']*'/,
    `11155111: '${contractAddress}'`
  );
  
  fs.writeFileSync(verifierPath, verifierContent);
  console.log("\nUpdated ethereum-verifier.js with new V2 contract address");
  
  console.log("\n✅ V2 Deployment complete!");
  console.log("This version accepts any valid proof for demo purposes.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });