const { ethers } = require('ethers');
require('dotenv').config();

async function revertToDemoFees() {
    console.log("🔄 Reverting to Demo-Friendly Fee Structure...\n");

    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const deviceVerifierAddress = "0x4d36690090D365709eeEA35B90D5d81e481Aef79";
    
    const contractABI = [
        "function updateFees(uint256 _registrationFee, uint256 _verificationFee, uint256 _rewardAmount) external",
        "function registrationFee() view returns (uint256)",
        "function verificationFee() view returns (uint256)",
        "function rewardAmount() view returns (uint256)"
    ];

    const contract = new ethers.Contract(deviceVerifierAddress, contractABI, wallet);

    console.log("📊 Current Mainnet-Like Fees:");
    const currentRegFee = await contract.registrationFee();
    const currentVerFee = await contract.verificationFee();
    const currentReward = await contract.rewardAmount();
    
    console.log("  Registration:", ethers.utils.formatEther(currentRegFee), "IOTX");
    console.log("  Verification:", ethers.utils.formatEther(currentVerFee), "IOTX");  
    console.log("  Reward:", ethers.utils.formatEther(currentReward), "IOTX");

    // Revert to demo-friendly fees
    const demoRegFee = ethers.utils.parseEther("0.01");    // 0.01 IOTX
    const demoVerFee = ethers.utils.parseEther("0.001");   // 0.001 IOTX
    const demoReward = ethers.utils.parseEther("0.1");     // 0.1 IOTX

    console.log("\n💡 Demo-Friendly Fees:");
    console.log("  Registration:", ethers.utils.formatEther(demoRegFee), "IOTX (affordable for demos)");
    console.log("  Verification:", ethers.utils.formatEther(demoVerFee), "IOTX");
    console.log("  Reward:", ethers.utils.formatEther(demoReward), "IOTX");

    try {
        console.log("\n🔄 Reverting to demo-friendly fees...");
        
        const tx = await contract.updateFees(demoRegFee, demoVerFee, demoReward, {
            gasLimit: 100000
        });
        
        console.log("📤 Transaction:", tx.hash);
        await tx.wait();
        
        console.log("✅ Fees reverted to demo-friendly structure!");
        console.log("🎯 Registration now costs only 0.01 IOTX");
        console.log("💰 Contract balance of 1.0 IOTX can support 10 registrations");
        console.log("🚀 Ready for demos without refilling contracts!");
        
        console.log("\n📊 Final Fee Structure:");
        console.log("  📝 Device Registration: 0.01 IOTX");
        console.log("  🔍 Proof Verification: 0.001 IOTX");
        console.log("  🎁 Reward Payout: 0.1 IOTX");
        console.log("  💡 Net cost per workflow: ~0.01 IOTX (with 0.1 IOTX reward)");
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

revertToDemoFees();