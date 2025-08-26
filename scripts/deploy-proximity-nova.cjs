const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying Proximity Nova Decider and Device Verifier V3...\n");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "IOTX\n");
    
    // Step 1: Deploy Proximity Nova Decider
    console.log("Step 1: Deploying Proximity Nova Decider...");
    const ProximityNovaDecider = await ethers.getContractFactory("ProximityNovaDecider");
    const novaDecider = await ProximityNovaDecider.deploy();
    await novaDecider.deployed();
    console.log("✅ Nova Decider deployed to:", novaDecider.address);
    
    // Step 2: Deploy Device Verifier V3
    console.log("\nStep 2: Deploying IoTeX Device Verifier V3...");
    const DeviceVerifierV3 = await ethers.getContractFactory("IoTeXDeviceVerifierV3");
    const deviceVerifier = await DeviceVerifierV3.deploy(novaDecider.address);
    await deviceVerifier.deployed();
    console.log("✅ Device Verifier V3 deployed to:", deviceVerifier.address);
    
    // Step 3: Fund the Device Verifier with IOTX for rewards
    console.log("\nStep 3: Funding Device Verifier with 2 IOTX for rewards...");
    const fundTx = await deployer.sendTransaction({
        to: deviceVerifier.address,
        value: ethers.utils.parseEther("2.0")
    });
    await fundTx.wait();
    console.log("✅ Device Verifier funded with 2 IOTX");
    
    // Step 4: Verify contract setup
    console.log("\nStep 4: Verifying contract setup...");
    const contractBalance = await ethers.provider.getBalance(deviceVerifier.address);
    console.log("Device Verifier balance:", ethers.utils.formatEther(contractBalance), "IOTX");
    
    const configuredDecider = await deviceVerifier.novaDecider();
    console.log("Configured Nova Decider:", configuredDecider);
    console.log("Setup verified:", configuredDecider === novaDecider.address ? "✅" : "❌");
    
    // Save deployment info
    const deploymentInfo = {
        network: "iotex-testnet",
        deploymentTime: new Date().toISOString(),
        contracts: {
            proximityNovaDecider: {
                address: novaDecider.address,
                type: "ProximityNovaDecider",
                description: "Nova proof verifier for device proximity circuits"
            },
            deviceVerifierV3: {
                address: deviceVerifier.address,
                type: "IoTeXDeviceVerifierV3",
                description: "Device verifier using Proximity Nova Decider",
                novaDecider: novaDecider.address,
                initialFunding: "2.0 IOTX"
            }
        },
        deployer: deployer.address,
        features: [
            "Custom Nova Decider for proximity proofs",
            "Validates coordinates (5000±100)",
            "Simplified Groth16 verification",
            "Rewards for valid proximity proofs",
            "2 IOTX initial reward pool"
        ]
    };
    
    const deploymentPath = path.join(__dirname, "../deployments/proximity-nova-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n✅ Deployment info saved to:", deploymentPath);
    
    // Print configuration update instructions
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\nTo use these contracts, update your configuration:");
    console.log("\n📝 In static/js/core/config.js:");
    console.log(`deviceVerifier: '${deviceVerifier.address}',`);
    console.log(`novaDecider: '${novaDecider.address}',`);
    console.log("\n💡 The new Nova Decider:");
    console.log("- Verifies proximity proofs specifically");
    console.log("- Checks coordinates are within 100 units of (5000, 5000)");
    console.log("- Simplified verification for testing");
    console.log("- Can be upgraded to full cryptographic verification later");
    console.log("\n💰 Rewards:");
    console.log("- 0.01 IOTX per valid proximity proof");
    console.log("- 2 IOTX initial pool (200 proofs)");
    console.log("- Only rewards if device is within proximity");
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });