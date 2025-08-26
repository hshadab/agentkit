const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Real IoTeX Proximity Verifier Contract...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📡 Deploying from account:", deployer.address);

    // Check balance
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", ethers.utils.formatEther(balance), "IOTX");

    if (balance.lt(ethers.utils.parseEther("0.5"))) {
        console.error("❌ Insufficient IOTX for deployment. Need at least 0.5 IOTX");
        console.log("Get testnet IOTX from: https://faucet.iotex.io/");
        process.exit(1);
    }

    console.log("\n📋 Deploying IoTeX Proximity Verifier with features:");
    console.log("  ✅ Device registration with ioID/DID generation");
    console.log("  ✅ Nova recursive SNARK proof verification");
    console.log("  ✅ Proximity constraint checking");
    console.log("  ✅ IOTX reward distribution");
    console.log("  ✅ Real smart contract functions");

    // Deploy the contract
    const ProximityVerifier = await ethers.getContractFactory("IoTeXProximityVerifier");
    
    console.log("\n⏳ Deploying contract...");
    const contract = await ProximityVerifier.deploy({
        gasLimit: 3000000,
        gasPrice: ethers.utils.parseUnits("1000", "gwei")
    });

    console.log("📤 Transaction hash:", contract.deployTransaction.hash);
    console.log("⏳ Waiting for confirmation...");

    await contract.deployed();

    console.log("\n✅ Contract deployed successfully!");
    console.log("📋 Contract Details:");
    console.log("  📍 Address:", contract.address);
    console.log("  🌐 Network: IoTeX Testnet");
    console.log("  🔗 Explorer: https://testnet.iotexscan.io/address/" + contract.address);
    console.log("  👤 Deployer:", deployer.address);

    // Fund the contract with rewards
    console.log("\n💸 Funding contract with reward pool...");
    const fundAmount = ethers.utils.parseEther("2.0"); // 2 IOTX for rewards
    
    const fundTx = await deployer.sendTransaction({
        to: contract.address,
        value: fundAmount,
        gasLimit: 21000
    });

    await fundTx.wait();
    console.log("✅ Contract funded with 2.0 IOTX for rewards");

    // Verify contract balance
    const contractBalance = await ethers.provider.getBalance(contract.address);
    console.log("💰 Contract balance:", ethers.utils.formatEther(contractBalance), "IOTX");

    // Test contract functions
    console.log("\n🧪 Testing contract functions...");
    
    try {
        // Test view functions
        const registrationFee = await contract.registrationFee();
        const verificationFee = await contract.verificationFee();
        const rewardAmount = await contract.rewardAmount();
        
        console.log("✅ Contract functions working:");
        console.log("  📝 Registration fee:", ethers.utils.formatEther(registrationFee), "IOTX");
        console.log("  🔍 Verification fee:", ethers.utils.formatEther(verificationFee), "IOTX");
        console.log("  🎁 Reward amount:", ethers.utils.formatEther(rewardAmount), "IOTX");
        
    } catch (error) {
        console.log("⚠️  Could not test view functions:", error.message);
    }

    // Save deployment information
    const deploymentInfo = {
        contractAddress: contract.address,
        deployerAddress: deployer.address,
        network: "IoTeX Testnet",
        chainId: 4690,
        deploymentTx: contract.deployTransaction.hash,
        timestamp: new Date().toISOString(),
        fundingTx: fundTx.hash,
        contractBalance: ethers.utils.formatEther(contractBalance) + " IOTX",
        features: [
            "Device Registration with ioID/DID",
            "Nova recursive SNARK verification", 
            "Proximity constraint checking",
            "IOTX reward distribution"
        ],
        fees: {
            registration: "0.01 IOTX",
            verification: "0.001 IOTX", 
            reward: "0.1 IOTX"
        }
    };

    const fs = require('fs');
    fs.writeFileSync('./deployed-contract-info.json', JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Deployment Summary:");
    console.log("  📍 Contract Address:", contract.address);
    console.log("  🔗 Explorer URL: https://testnet.iotexscan.io/address/" + contract.address);
    console.log("  📄 Deployment details saved to: deployed-contract-info.json");
    
    console.log("\n🚀 Ready to use with real smart contract functions!");
    console.log("  📝 registerDevice(deviceId, deviceType)");
    console.log("  🔍 verifyDeviceProximity(deviceId, proof, publicInputs)");
    console.log("  🎁 claimRewards(deviceId)");
    console.log("  📊 getDevice(deviceId)");

    return contract.address;
}

main()
    .then((address) => {
        console.log("\n✅ Deployment completed successfully!");
        console.log("Contract address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });