const hre = require("hardhat");
const fs = require("fs").promises;
const path = require("path");

async function main() {
    console.log("🚀 Deploying ZKMLNovaVerifier to", hre.network.name);
    
    // For Hardhat with ethers v5
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    // Get balance
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
    
    if (balance.eq(0)) {
        console.error("❌ No balance! Get testnet ETH from:");
        console.error("   Sepolia: https://sepoliafaucet.com");
        console.error("   Base: https://faucet.quicknode.com/base/sepolia");
        console.error("   IoTeX: https://faucet.testnet.iotex.io");
        process.exit(1);
    }
    
    // Deploy contract
    console.log("\n📋 Deploying ZKMLNovaVerifier...");
    const ZKMLNovaVerifier = await hre.ethers.getContractFactory("ZKMLNovaVerifier");
    const verifier = await ZKMLNovaVerifier.deploy();
    
    await verifier.deployed();
    
    console.log("✅ ZKMLNovaVerifier deployed to:", verifier.address);
    
    // Get deployment transaction
    const deployTx = verifier.deployTransaction;
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await deployer.provider.getNetwork()).chainId,
        address: verifier.address,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        transactionHash: deployTx.hash,
        blockNumber: deployTx.blockNumber
    };
    
    const deploymentPath = path.join(__dirname, "..", "deployments", `zkml-verifier-${hre.network.name}.json`);
    await fs.mkdir(path.dirname(deploymentPath), { recursive: true });
    await fs.writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📊 Deployment Summary:");
    console.log("   Network:", deploymentInfo.network);
    console.log("   Chain ID:", deploymentInfo.chainId);
    console.log("   Contract:", deploymentInfo.address);
    console.log("   Deployer:", deploymentInfo.deployer);
    console.log("   TX Hash:", deploymentInfo.transactionHash);
    
    // Explorer link
    const explorerUrl = 
        hre.network.name === "sepolia" ? `https://sepolia.etherscan.io/address/${verifier.address}` :
        hre.network.name === "base-sepolia" ? `https://sepolia.basescan.org/address/${verifier.address}` :
        hre.network.name === "iotex-testnet" ? `https://testnet.iotexscan.io/address/${verifier.address}` :
        "";
    
    if (explorerUrl) {
        console.log("\n🔗 View on Explorer:");
        console.log("   " + explorerUrl);
    }
    
    console.log("\n✅ Deployment complete! Saved to:", deploymentPath);
    console.log("\n📝 Next steps:");
    console.log("1. Update api/zkml-verifier-backend.js with address:", verifier.address);
    console.log("2. Restart the backend service");
    console.log("3. Test with ?real=true in Gateway URL");
    
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });