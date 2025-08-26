const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 Deploying Real IoTeX Proximity Verifier Contract...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📡 Deploying from account:", deployer.address);

    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.utils.formatEther(balance), "IOTX");

    if (balance < ethers.utils.parseEther("0.1")) {
        console.error("❌ Insufficient IOTX for deployment. Need at least 0.1 IOTX");
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
        gasPrice: ethers.parseUnits("1000", "gwei")
    });

    console.log("📤 Transaction hash:", contract.deploymentTransaction().hash);
    console.log("⏳ Waiting for confirmation...");

    await contract.waitForDeployment();

    console.log("\n✅ Contract deployed successfully!");
    console.log("📋 Contract Details:");
    console.log("  📍 Address:", await contract.getAddress());
    console.log("  🌐 Network: IoTeX Testnet");
    console.log("  🔗 Explorer: https://testnet.iotexscan.io/address/" + await contract.getAddress());
    console.log("  👤 Deployer:", deployer.address);

    // Fund the contract with rewards
    console.log("\n💸 Funding contract with reward pool...");
    const fundAmount = ethers.utils.parseEther("1.0"); // 1 IOTX for rewards
    const contractAddress = await contract.getAddress();
    
    try {
        const fundTx = await deployer.sendTransaction({
            to: contractAddress,
            value: fundAmount,
            gasLimit: 21000
        });

        await fundTx.wait();
        console.log("✅ Contract funded with 1.0 IOTX for rewards");
        console.log("📤 Funding transaction:", fundTx.hash);
    } catch (fundError) {
        console.log("⚠️  Could not fund contract:", fundError.message);
    }

    // Verify contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log("💰 Contract balance:", ethers.utils.formatEther(contractBalance), "IOTX");

    // Test contract functions
    console.log("\n🧪 Testing contract functions...");
    
    try {
        // Test view functions
        const registrationFee = await contract.registrationFee();
        const verificationFee = await contract.verificationFee();
        const rewardAmount = await contract.rewardAmount();
        const totalDevices = await contract.totalDevicesRegistered();
        
        console.log("✅ Contract functions working:");
        console.log("  📝 Registration fee:", ethers.utils.formatEther(registrationFee), "IOTX");
        console.log("  🔍 Verification fee:", ethers.utils.formatEther(verificationFee), "IOTX");
        console.log("  🎁 Reward amount:", ethers.utils.formatEther(rewardAmount), "IOTX");
        console.log("  📊 Total devices registered:", totalDevices.toString());
        
    } catch (error) {
        console.log("⚠️  Could not test view functions:", error.message);
    }

    // Save deployment information
    const deploymentInfo = {
        contractAddress: contractAddress,
        deployerAddress: deployer.address,
        network: "IoTeX Testnet",
        chainId: 4690,
        deploymentTx: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        contractBalance: ethers.utils.formatEther(contractBalance) + " IOTX",
        explorerUrl: "https://testnet.iotexscan.io/address/" + contractAddress,
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
        },
        abi: [
            "function registerDevice(bytes32 deviceId, string deviceType) payable returns (string ioId, string did)",
            "function verifyDeviceProximity(bytes32 deviceId, tuple(uint256[3] i_z0_zi, uint256[4] U_i_cmW_U_i_cmE, uint256[2] u_i_cmW, uint256[3] cmT_r, uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[4] challenge_W_challenge_E_kzg_evals, uint256[2][2] kzg_proof) proof, uint256[4] publicInputs) payable returns (bool verified, uint256 reward)",
            "function claimRewards(bytes32 deviceId) returns (uint256 amount)",
            "function getDevice(bytes32 deviceId) view returns (tuple(address owner, bool registered, uint256 registrationTime, string ioId, string did, uint256 totalRewards, bool isVerified))",
            "function getContractBalance() view returns (uint256)"
        ]
    };

    fs.writeFileSync('./deployed-contract-info.json', JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Deployment Summary:");
    console.log("  📍 Contract Address:", contractAddress);
    console.log("  🔗 Explorer URL: https://testnet.iotexscan.io/address/" + contractAddress);
    console.log("  📄 Deployment details saved to: deployed-contract-info.json");
    
    console.log("\n📝 Next Steps:");
    console.log("  1. Update static/js/core/config.js with new contract address");
    console.log("  2. Test smart contract functions via UI");
    console.log("  3. Verify Nova proof generation and verification");
    
    console.log("\n🚀 Smart Contract Functions Available:");
    console.log("  📝 registerDevice(deviceId, deviceType) → (ioId, did)");
    console.log("  🔍 verifyDeviceProximity(deviceId, proof, publicInputs) → (verified, reward)");
    console.log("  🎁 claimRewards(deviceId) → amount");
    console.log("  📊 getDevice(deviceId) → deviceData");

    return contractAddress;
}

main()
    .then((address) => {
        console.log("\n✅ Real smart contract deployment completed successfully!");
        console.log("Contract address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });