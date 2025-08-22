// Direct Gateway funding using Circle's exact method
const { ethers } = require('ethers');

const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

console.log('💰 DIRECT GATEWAY FUNDING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function fundGatewayDirect() {
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('\\n🔧 Setup:');
        console.log(`   📍 Your wallet: ${WALLET_ADDRESS}`);
        console.log(`   🏦 Gateway wallet: ${GATEWAY_WALLET}`);
        console.log(`   💵 Funding amount: 0.5 USDC`);
        
        // USDC contract
        const usdcABI = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address owner) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)'
        ];
        
        const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcABI, wallet);
        
        // Check current balance
        const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log(`\\n💰 Current USDC balance: ${balanceFormatted} USDC`);
        
        if (parseFloat(balanceFormatted) < 0.5) {
            console.log('❌ Insufficient USDC for transfer');
            return;
        }
        
        // Option 1: Direct transfer to Gateway wallet (simpler approach)
        console.log('\\n🚀 Method 1: Direct USDC transfer to Gateway wallet');
        const transferAmount = ethers.utils.parseUnits('0.5', 6); // 0.5 USDC
        
        console.log('   📝 Sending 0.5 USDC directly to Gateway wallet...');
        const transferTx = await usdcContract.transfer(GATEWAY_WALLET, transferAmount);
        console.log(`   📤 Transfer TX: ${transferTx.hash}`);
        console.log('   ⏳ Waiting for confirmation...');
        
        await transferTx.wait();
        console.log('   ✅ Transfer confirmed!');
        
        // Check new balances
        const newBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const newBalanceFormatted = ethers.utils.formatUnits(newBalance, 6);
        
        const gatewayBalance = await usdcContract.balanceOf(GATEWAY_WALLET);
        const gatewayBalanceFormatted = ethers.utils.formatUnits(gatewayBalance, 6);
        
        console.log('\\n📊 Results:');
        console.log(`   📱 Your remaining USDC: ${newBalanceFormatted} USDC`);
        console.log(`   🏦 Gateway wallet USDC: ${gatewayBalanceFormatted} USDC`);
        console.log(`   ✅ Transferred: ${(parseFloat(balanceFormatted) - parseFloat(newBalanceFormatted)).toFixed(6)} USDC`);
        
        console.log('\\n🎯 Next Steps:');
        console.log('   1. Test Gateway balance: node demo-agent-authorization.js');
        console.log('   2. Run live demo: node demo-agent-authorization.js --live');
        console.log(`   3. Transaction: ${transferTx.hash}`);
        
    } catch (error) {
        console.error('❌ Direct funding failed:', error.message);
    }
}

fundGatewayDirect().catch(console.error);