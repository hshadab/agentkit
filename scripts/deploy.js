const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment to Sepolia testnet...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("Error: Insufficient balance. Please fund your wallet with Sepolia ETH");
    console.log("Get Sepolia ETH from:");
    console.log("  - https://sepoliafaucet.com/");
    console.log("  - https://www.alchemy.com/faucets/ethereum-sepolia");
    process.exit(1);
  }

  // Deploy SimplifiedZKVerifier
  console.log("\nDeploying SimplifiedZKVerifier...");
  const SimplifiedZKVerifier = await hre.ethers.getContractFactory("contracts/SimplifiedZKVerifier.sol:SimplifiedZKVerifier");
  const verifier = await SimplifiedZKVerifier.deploy();
  
  // Wait for deployment
  await verifier.waitForDeployment();
  const contractAddress = await verifier.getAddress();
  
  console.log("SimplifiedZKVerifier deployed to:", contractAddress);
  console.log("Transaction hash:", verifier.deploymentTransaction().hash);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + contractAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contracts: {
      SimplifiedZKVerifier: {
        address: contractAddress,
        transactionHash: verifier.deploymentTransaction().hash,
        deployer: deployer.address,
        deployedAt: new Date().toISOString()
      }
    }
  };
  
  const deploymentPath = path.join(__dirname, "..", "deployment-sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);
  
  // Update ethereum-verifier.js automatically
  const verifierPath = path.join(__dirname, "..", "static", "ethereum-verifier.js");
  let verifierContent = fs.readFileSync(verifierPath, 'utf8');
  
  // Replace the placeholder address
  verifierContent = verifierContent.replace(
    /11155111: '0x[^']*'/,
    `11155111: '${contractAddress}'`
  );
  
  fs.writeFileSync(verifierPath, verifierContent);
  console.log("\nUpdated ethereum-verifier.js with new contract address");
  
  console.log("\n✅ Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Verify the contract on Etherscan (optional):");
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
  console.log("2. Test the verification flow in the UI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });