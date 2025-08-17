const { ethers } = require('ethers');
require('dotenv').config();

async function debugContractState() {
    console.log("🔍 Debugging Smart Contract State...\n");

    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const contractAddress = "0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14";
    
    const contractABI = [
        "function getContractBalance() view returns (uint256)",
        "function rewardAmount() view returns (uint256)",
        "function totalDevicesRegistered() view returns (uint256)",
        "function totalVerifications() view returns (uint256)",
        "function getDevice(bytes32 deviceId) view returns (tuple(address owner, bool registered, uint256 registrationTime, string ioId, string did, uint256 totalRewards, bool isVerified))"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log("📍 Contract Address:", contractAddress);
    console.log("👤 Checking from wallet:", wallet.address);

    try {
        // Check contract balance
        const contractBalance = await contract.getContractBalance();
        console.log("💰 Contract Balance:", ethers.utils.formatEther(contractBalance), "IOTX");

        // Check reward amount
        const rewardAmount = await contract.rewardAmount();
        console.log("🎁 Reward Amount:", ethers.utils.formatEther(rewardAmount), "IOTX");

        // Check total stats
        const totalDevices = await contract.totalDevicesRegistered();
        const totalVerifications = await contract.totalVerifications();
        console.log("📊 Total Devices:", totalDevices.toString());
        console.log("📊 Total Verifications:", totalVerifications.toString());

        // Check the actual registered device
        const deviceId = "0xee719d8103e0fab88d5847ebe67db3287632c23a9736aa17079434a5643e7ba6";
        console.log("\n🔍 Checking actual registered device:");
        console.log("📱 Device ID (bytes32):", deviceId);

        try {
            const deviceData = await contract.getDevice(deviceId);
            console.log("📋 Device Data:");
            console.log("  👤 Owner:", deviceData.owner);
            console.log("  ✅ Registered:", deviceData.registered);
            console.log("  ⏰ Registration Time:", new Date(Number(deviceData.registrationTime) * 1000).toISOString());
            console.log("  🆔 ioID:", deviceData.ioId);
            console.log("  🔒 DID:", deviceData.did);
            console.log("  💰 Total Rewards:", ethers.utils.formatEther(deviceData.totalRewards), "IOTX");
            console.log("  ✅ Is Verified:", deviceData.isVerified);
        } catch (deviceError) {
            console.log("❌ Device not found or error:", deviceError.message);
        }

        // Check if there are any pending rewards to claim
        console.log("\n💡 Analysis:");
        if (contractBalance > 0) {
            console.log("✅ Contract has funds for rewards");
        } else {
            console.log("❌ Contract has no funds - rewards cannot be claimed");
        }

    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

debugContractState();