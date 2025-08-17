const { ethers } = require('ethers');
require('dotenv').config();

async function fundNovaDecider() {
    console.log("💸 Funding Nova Decider Contract...\n");

    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const novaDeciderAddress = "0x4EF6152c952dA7A27bb57E8b989348a73aB850d2";
    
    console.log("📡 Funding from account:", wallet.address);
    console.log("📍 Nova Decider contract:", novaDeciderAddress);

    // Check wallet balance
    const walletBalance = await wallet.provider.getBalance(wallet.address);
    console.log("💰 Wallet balance:", ethers.utils.formatEther(walletBalance), "IOTX");

    // Check current contract balance
    const currentBalance = await provider.getBalance(novaDeciderAddress);
    console.log("💰 Current contract balance:", ethers.utils.formatEther(currentBalance), "IOTX");

    if (walletBalance < ethers.utils.parseEther("0.5")) {
        console.error("❌ Insufficient IOTX in wallet for funding");
        process.exit(1);
    }

    // Fund with 0.5 IOTX for Nova proof processing
    const fundAmount = ethers.utils.parseEther("0.5");
    
    console.log(`\n💸 Funding Nova Decider with ${ethers.utils.formatEther(fundAmount)} IOTX...`);
    
    try {
        const fundTx = await wallet.sendTransaction({
            to: novaDeciderAddress,
            value: fundAmount,
            gasLimit: 21000
        });

        console.log("📤 Funding transaction:", fundTx.hash);
        console.log("⏳ Waiting for confirmation...");

        await fundTx.wait();
        
        // Check new balance
        const newBalance = await provider.getBalance(novaDeciderAddress);
        console.log("✅ Nova Decider funded successfully!");
        console.log("💰 New contract balance:", ethers.utils.formatEther(newBalance), "IOTX");
        
        console.log("\n🎯 Contract Funding Summary:");
        console.log("  📍 deviceVerifier:", "1.0 IOTX ✅ (for registration/verification/rewards)");
        console.log("  📍 novaDecider:", ethers.utils.formatEther(newBalance), "IOTX ✅ (for Nova proof processing)");
        console.log("  📍 ioIDRegistry:", "0.0 IOTX (optional - not used in main workflow)");
        console.log("  📍 ioID:", "0.0 IOTX (optional - not used in main workflow)");
        
        console.log("\n🚀 All contracts ready for 4-step IoTeX workflow!");
        
    } catch (error) {
        console.error("❌ Funding failed:", error.message);
        process.exit(1);
    }
}

fundNovaDecider();