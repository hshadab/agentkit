#!/usr/bin/env node

/**
 * Deploy RealZKMLNovaVerifier to Ethereum Sepolia
 */

const hre = require("hardhat");
const fs = require('fs').promises;
const path = require('path');

async function main() {
    console.log("🚀 Deploying RealZKMLNovaVerifier to Sepolia...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Check balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");

    if (balance.lt(hre.ethers.utils.parseEther("0.005"))) {
        console.error("❌ Insufficient balance. Need at least 0.005 ETH");
        console.log("\n📝 To fund your wallet:");
        console.log(`   1. Go to https://sepoliafaucet.com`);
        console.log(`   2. Enter your address: ${deployer.address}`);
        console.log(`   3. Request 0.005 ETH`);
        process.exit(1);
    }

    // Deploy RealZKMLNovaVerifier
    console.log("\n📋 Deploying RealZKMLNovaVerifier contract...");
    const RealZKMLNovaVerifier = await hre.ethers.getContractFactory("RealZKMLNovaVerifier");
    
    const gasPrice = await deployer.getGasPrice();
    console.log("Current gas price:", hre.ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    
    const verifier = await RealZKMLNovaVerifier.deploy({
        gasPrice: gasPrice.mul(110).div(100) // 10% buffer
    });

    console.log("Transaction hash:", verifier.deployTransaction.hash);
    console.log("Waiting for confirmation...");
    
    await verifier.deployed();
    
    console.log("✅ RealZKMLNovaVerifier deployed to:", verifier.address);

    // Wait for block confirmations
    console.log("\n⏳ Waiting for 3 block confirmations...");
    await verifier.deployTransaction.wait(3);
    
    // Verify the contract on Etherscan
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
        await hre.run("verify:verify", {
            address: verifier.address,
            constructorArguments: [],
        });
        console.log("✅ Contract verified on Etherscan");
    } catch (error) {
        console.log("⚠️  Etherscan verification failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        verifierAddress: verifier.address,
        deploymentTx: verifier.deployTransaction.hash,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        gasUsed: (await verifier.deployTransaction.wait()).gasUsed.toString(),
        etherscanUrl: `https://sepolia.etherscan.io/address/${verifier.address}`
    };

    const deploymentPath = path.join(__dirname, '..', 'deployments', 'sepolia-nova-verifier.json');
    await fs.mkdir(path.dirname(deploymentPath), { recursive: true });
    await fs.writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n📊 Deployment Summary:");
    console.log("=".repeat(60));
    console.log(`  Contract: RealZKMLNovaVerifier`);
    console.log(`  Address: ${verifier.address}`);
    console.log(`  Network: Sepolia`);
    console.log(`  Explorer: ${deploymentInfo.etherscanUrl}`);
    console.log(`  Gas Used: ${deploymentInfo.gasUsed}`);
    console.log("=".repeat(60));

    // Test the deployed contract
    console.log("\n🧪 Testing deployed contract...");
    const gasEstimate = await verifier.estimateVerificationGas();
    console.log(`  Verification gas estimate: ${gasEstimate.toString()}`);
    
    console.log("\n✅ Deployment complete!");
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Update backend with contract address: ${verifier.address}`);
    console.log(`   2. Test zkML verification through UI`);
    
    return verifier.address;
}

main()
    .then((address) => {
        console.log(`\n✅ Success! Contract at: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });