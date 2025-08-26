// Deploy Medical Records Integrity Contract to Avalanche using Hardhat
const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying Medical Records Integrity contract to Avalanche...");
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "AVAX");
    
    // Deploy contract
    const MedicalRecordsIntegrity = await hre.ethers.getContractFactory("MedicalRecordsIntegrity");
    const medicalContract = await MedicalRecordsIntegrity.deploy();
    
    await medicalContract.deployed();
    
    console.log("✅ MedicalRecordsIntegrity deployed to:", medicalContract.address);
    console.log("🔗 Explorer: https://testnet.snowtrace.io/address/" + medicalContract.address);
    
    // Fund the contract with some AVAX for rewards
    console.log("\n💸 Funding contract with 0.1 AVAX for rewards...");
    const fundTx = await deployer.sendTransaction({
        to: medicalContract.address,
        value: hre.ethers.utils.parseEther("0.1")
    });
    await fundTx.wait();
    console.log("✅ Contract funded");
    
    // Save deployment info
    const fs = require('fs');
    const path = require('path');
    
    const deploymentInfo = {
        network: "avalanche-fuji-testnet",
        address: medicalContract.address,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        transactionHash: medicalContract.deployTransaction.hash,
        blockNumber: medicalContract.deployTransaction.blockNumber
    };
    
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(deploymentsDir, 'avalanche-medical.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📝 Deployment info saved to deployments/avalanche-medical.json");
    
    // Update frontend config
    const configPath = path.join(__dirname, '../static/js/core/config.js');
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Check if AVALANCHE_MEDICAL_CONTRACT exists
        if (configContent.includes('AVALANCHE_MEDICAL_CONTRACT')) {
            // Update existing entry
            configContent = configContent.replace(
                /AVALANCHE_MEDICAL_CONTRACT:\s*['"][^'"]*['"]/,
                `AVALANCHE_MEDICAL_CONTRACT: '${medicalContract.address}'`
            );
        } else {
            // Add new entry
            configContent = configContent.replace(
                'window.CONFIG = {',
                `window.CONFIG = {\n    AVALANCHE_MEDICAL_CONTRACT: '${medicalContract.address}',`
            );
        }
        
        fs.writeFileSync(configPath, configContent);
        console.log("✅ Frontend config updated with contract address");
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Verify the contract on Snowtrace (optional)");
    console.log("2. Test the medical records workflow");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });