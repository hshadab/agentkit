const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function main() {
    console.log("🚀 Deploying Real IoTeX Proximity Verifier Contract...\n");

    // Check private key
    if (!process.env.IOTEX_PRIVATE_KEY) {
        console.error("❌ IOTEX_PRIVATE_KEY not found in .env file");
        console.log("Add your private key to .env: IOTEX_PRIVATE_KEY=0x...");
        process.exit(1);
    }

    // Set up provider and wallet
    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    console.log("📡 Deploying from account:", wallet.address);

    // Check balance
    const balance = await wallet.provider.getBalance(wallet.address);
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

    // Contract bytecode and ABI (simplified for deployment)
    const contractABI = [
        "constructor()",
        "function registrationFee() view returns (uint256)",
        "function verificationFee() view returns (uint256)",
        "function rewardAmount() view returns (uint256)",
        "function totalDevicesRegistered() view returns (uint256)",
        "function registerDevice(bytes32 deviceId, string deviceType) payable returns (string ioId, string did)",
        "function verifyDeviceProximity(bytes32 deviceId, tuple(uint256[3] i_z0_zi, uint256[4] U_i_cmW_U_i_cmE, uint256[2] u_i_cmW, uint256[3] cmT_r, uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[4] challenge_W_challenge_E_kzg_evals, uint256[2][2] kzg_proof) proof, uint256[4] publicInputs) payable returns (bool verified, uint256 reward)",
        "function claimRewards(bytes32 deviceId) returns (uint256 amount)",
        "function getDevice(bytes32 deviceId) view returns (tuple(address owner, bool registered, uint256 registrationTime, string ioId, string did, uint256 totalRewards, bool isVerified))",
        "function getContractBalance() view returns (uint256)",
        "event DeviceRegistered(bytes32 indexed deviceId, address indexed owner, uint256 timestamp, string ioId, string did)",
        "event ProximityVerified(bytes32 indexed deviceId, address indexed verifier, bool withinProximity, uint256 reward, uint256 timestamp)",
        "event RewardsClaimed(bytes32 indexed deviceId, address indexed claimer, uint256 amount)"
    ];

    // Read compiled contract
    let contractBytecode;
    try {
        const compiledContract = JSON.parse(fs.readFileSync('./artifacts/contracts/IoTeXProximityVerifier.sol/IoTeXProximityVerifier.json', 'utf8'));
        contractBytecode = compiledContract.bytecode;
        console.log("✅ Contract bytecode loaded from compiled artifacts");
    } catch (error) {
        console.log("⚠️  Could not load compiled contract, compiling now...");
        
        // Try to compile using Hardhat
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec('HARDHAT_CONFIG=hardhat.config.cjs npx hardhat compile', (error, stdout, stderr) => {
                if (error) {
                    console.log("Compilation output:", stdout);
                    console.log("Compilation errors:", stderr);
                    reject(error);
                } else {
                    console.log("✅ Contract compiled successfully");
                    resolve();
                }
            });
        });

        // Try loading again
        const compiledContract = JSON.parse(fs.readFileSync('./artifacts/contracts/IoTeXProximityVerifier.sol/IoTeXProximityVerifier.json', 'utf8'));
        contractBytecode = compiledContract.bytecode;
    }

    console.log("\n⏳ Deploying contract...");
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);
    
    // Deploy contract
    const contract = await contractFactory.deploy({
        gasLimit: 3000000,
        gasPrice: ethers.parseUnits("1000", "gwei")
    });

    console.log("📤 Transaction hash:", contract.deploymentTransaction().hash);
    console.log("⏳ Waiting for confirmation...");

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ Contract deployed successfully!");
    console.log("📋 Contract Details:");
    console.log("  📍 Address:", contractAddress);
    console.log("  🌐 Network: IoTeX Testnet");
    console.log("  🔗 Explorer: https://testnet.iotexscan.io/address/" + contractAddress);
    console.log("  👤 Deployer:", wallet.address);

    // Fund the contract with rewards
    console.log("\n💸 Funding contract with reward pool...");
    const fundAmount = ethers.utils.parseEther("1.0"); // 1 IOTX for rewards
    
    try {
        const fundTx = await wallet.sendTransaction({
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
    const contractBalance = await provider.getBalance(contractAddress);
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
        deployerAddress: wallet.address,
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
        abi: contractABI
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