const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying IoTeX Device Verifier Mock to IoTeX Testnet...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "IOTX");
    
    // Deploy the mock contract
    const MockVerifier = await ethers.getContractFactory("IoTeXDeviceVerifierMockSimple");
    console.log("Deploying mock verifier...");
    
    const mockVerifier = await MockVerifier.deploy();
    await mockVerifier.deployed();
    
    console.log("Mock Verifier deployed to:", mockVerifier.address);
    
    // Fund the reward pool with 1 IOTX
    console.log("Funding reward pool with 1 IOTX...");
    const fundTx = await deployer.sendTransaction({
        to: mockVerifier.address,
        value: ethers.utils.parseEther("1.0")
    });
    await fundTx.wait();
    console.log("Reward pool funded!");
    
    // Save deployment info
    const deploymentInfo = {
        network: "iotex-testnet",
        contractType: "IoTeXDeviceVerifierMockSimple",
        address: mockVerifier.address,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        rewardPoolInitial: "1.0 IOTX",
        features: [
            "No cryptographic verification required",
            "Simple coordinate-based proximity check",
            "Funded reward pool",
            "Immediate rewards for valid proximity"
        ]
    };
    
    const deploymentPath = path.join(__dirname, "../deployments/iotex-mock-verifier.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentPath);
    
    // Update config
    console.log("\nTo use this mock verifier, update your config:");
    console.log(`deviceVerifier: '${mockVerifier.address}'`);
    
    console.log("\n✅ Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });