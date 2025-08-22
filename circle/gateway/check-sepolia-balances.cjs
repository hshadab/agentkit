// Check Sepolia testnet balances for Gateway demo
const { ethers } = require('ethers');

const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const SEPOLIA_RPC = 'https://ethereum-sepolia.publicnode.com';
const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

console.log('🔍 SEPOLIA TESTNET BALANCE CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Wallet: ${WALLET_ADDRESS}`);
console.log(`🌐 Network: Ethereum Sepolia`);

async function checkSepoliaBalances() {
    try {
        console.log('\\n🔗 Connecting to Sepolia testnet...');
        const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
        
        // Check ETH balance
        console.log('\\n⛽ Sepolia ETH Balance:');
        const ethBalance = await provider.getBalance(WALLET_ADDRESS);
        const ethFormatted = ethers.utils.formatEther(ethBalance);
        console.log(`   💎 ETH Balance: ${ethFormatted} ETH`);
        
        if (parseFloat(ethFormatted) >= 0.01) {
            console.log('   ✅ ETH Balance: SUFFICIENT for gas fees');
        } else {
            console.log('   ❌ ETH Balance: INSUFFICIENT - need testnet ETH');
            console.log('   🚰 Get ETH from: https://sepoliafaucet.com/');
        }
        
        // Check USDC balance
        console.log('\\n🪙 Sepolia USDC Balance:');
        const usdcABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)'
        ];
        
        const usdcContract = new ethers.Contract(SEPOLIA_USDC, usdcABI, provider);
        const usdcBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const usdcDecimals = await usdcContract.decimals();
        const usdcFormatted = ethers.utils.formatUnits(usdcBalance, usdcDecimals);
        
        console.log(`   💵 USDC Balance: ${usdcFormatted} USDC`);
        
        if (parseFloat(usdcFormatted) >= 1.0) {
            console.log('   ✅ USDC Balance: SUFFICIENT for Gateway demo');
        } else {
            console.log('   ❌ USDC Balance: INSUFFICIENT - need testnet USDC');
            console.log('   🚰 Get USDC from: https://faucet.circle.com/');
        }
        
        // Overall status
        console.log('\\n📊 TESTNET FUNDING STATUS:');
        const ethReady = parseFloat(ethFormatted) >= 0.01;
        const usdcReady = parseFloat(usdcFormatted) >= 1.0;
        
        if (ethReady && usdcReady) {
            console.log('   🎉 SEPOLIA WALLET READY FOR GATEWAY DEMO!');
            console.log('   ✅ ETH for gas: Ready');
            console.log('   ✅ USDC for demo: Ready');
            console.log('   🎯 Next: Fund Gateway wallet on Sepolia');
        } else {
            console.log('   ⚠️ SEPOLIA WALLET NEEDS FUNDING');
            console.log('\\n💡 FUNDING STEPS:');
            if (!ethReady) {
                console.log('   1. Get Sepolia ETH from faucet:');
                console.log('      🚰 https://sepoliafaucet.com/');
                console.log(`      📤 Send to: ${WALLET_ADDRESS}`);
            }
            if (!usdcReady) {
                console.log('   2. Get Sepolia USDC from Circle faucet:');
                console.log('      🚰 https://faucet.circle.com/');
                console.log(`      📤 Send to: ${WALLET_ADDRESS}`);
            }
        }
        
        console.log('\\n🔗 SEPOLIA LINKS:');
        console.log(`   🔍 Etherscan: https://sepolia.etherscan.io/address/${WALLET_ADDRESS}`);
        console.log(`   🪙 USDC Token: https://sepolia.etherscan.io/token/${SEPOLIA_USDC}?a=${WALLET_ADDRESS}`);
        
    } catch (error) {
        console.error('❌ Sepolia balance check failed:', error.message);
        console.log('\\n💡 Possible issues:');
        console.log('   • Sepolia RPC endpoint down');
        console.log('   • Network connectivity issues');
        console.log('   • Wallet address format incorrect');
    }
}

checkSepoliaBalances().catch(console.error);