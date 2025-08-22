// Check Gateway unified balance after deposit
const { ethers } = require('ethers');

const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const GATEWAY_WALLET_CONTRACT = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

console.log('🔍 GATEWAY BALANCE VERIFICATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function checkGatewayBalance() {
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
        
        // Check USDC balance in Gateway wallet contract
        const usdcABI = [
            'function balanceOf(address owner) view returns (uint256)'
        ];
        
        const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcABI, provider);
        
        console.log('\n💰 Balance Check Results:');
        
        // Your wallet USDC balance
        const walletBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const walletFormatted = ethers.utils.formatUnits(walletBalance, 6);
        console.log(`   📱 Your wallet USDC: ${walletFormatted} USDC`);
        
        // Gateway contract USDC balance (should show deposited amount)
        const gatewayBalance = await usdcContract.balanceOf(GATEWAY_WALLET_CONTRACT);
        const gatewayFormatted = ethers.utils.formatUnits(gatewayBalance, 6);
        console.log(`   🏦 Gateway wallet USDC: ${gatewayFormatted} USDC`);
        
        console.log('\n📊 Analysis:');
        if (parseFloat(gatewayFormatted) >= 1.0) {
            console.log('   ✅ Gateway wallet has sufficient USDC for demos');
            console.log('   🎯 Ready for live multi-chain transfers!');
        } else {
            console.log('   ⚠️ Gateway wallet may need more USDC');
            console.log('   💡 The deposit may still be processing');
        }
        
        console.log('\n🔗 Transaction Verification:');
        console.log('   📤 Approval TX: 0x54443ce76f91c768174877c383d43370122c4b21a9e0536fdeb759402dd567d3');
        console.log('   📤 Deposit TX: 0xb8bfc0082b3088464d067b94d36aa260e2cbdbb0622bd8e8ea5b4d425df03052');
        console.log('   🔍 Check on Etherscan for confirmation');
        
    } catch (error) {
        console.error('❌ Balance check failed:', error.message);
    }
}

checkGatewayBalance().catch(console.error);