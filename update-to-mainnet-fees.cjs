const { ethers } = require('ethers');
require('dotenv').config();

async function updateToMainnetFees() {
    console.log("💰 Updating to Mainnet-Like Fee Structure...\n");

    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const deviceVerifierAddress = "0x4d36690090D365709eeEA35B90D5d81e481Aef79";
    
    const contractABI = [
        "function updateFees(uint256 _registrationFee, uint256 _verificationFee, uint256 _rewardAmount) external",
        "function registrationFee() view returns (uint256)",
        "function verificationFee() view returns (uint256)",
        "function rewardAmount() view returns (uint256)",
        "function owner() view returns (address)"
    ];

    const contract = new ethers.Contract(deviceVerifierAddress, contractABI, wallet);

    console.log("📊 Current Fees:");
    const currentRegFee = await contract.registrationFee();
    const currentVerFee = await contract.verificationFee();
    const currentReward = await contract.rewardAmount();
    
    console.log("  Registration:", ethers.utils.formatEther(currentRegFee), "IOTX");
    console.log("  Verification:", ethers.utils.formatEther(currentVerFee), "IOTX");  
    console.log("  Reward:", ethers.utils.formatEther(currentReward), "IOTX");

    // Mainnet-like fees (scaled down for testnet)
    const newRegFee = ethers.utils.parseEther("10.0");    // 10 IOTX (instead of 1000)
    const newVerFee = ethers.utils.parseEther("0.1");     // 0.1 IOTX
    const newReward = ethers.utils.parseEther("1.0");     // 1.0 IOTX

    console.log("\n💡 Proposed Mainnet-Like Fees:");
    console.log("  Registration:", ethers.utils.formatEther(newRegFee), "IOTX (closer to mainnet scale)");
    console.log("  Verification:", ethers.utils.formatEther(newVerFee), "IOTX");
    console.log("  Reward:", ethers.utils.formatEther(newReward), "IOTX");

    try {
        const owner = await contract.owner();
        console.log("\n👤 Contract owner:", owner);
        console.log("👤 Your address:", wallet.address);
        
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
            console.log("\n🔄 Updating fees to mainnet-like structure...");
            
            const tx = await contract.updateFees(newRegFee, newVerFee, newReward, {
                gasLimit: 100000
            });
            
            console.log("📤 Transaction:", tx.hash);
            await tx.wait();
            
            console.log("✅ Fees updated to mainnet-like structure!");
            console.log("🎯 Now costs 10 IOTX to register (closer to real mainnet)");
        } else {
            console.log("❌ Only contract owner can update fees");
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

updateToMainnetFees();