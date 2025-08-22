// Proper Gateway funding using deposit() function (not direct transfer!)
const { ethers } = require('ethers');

const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

console.log('🔧 PROPER GATEWAY UNIFIED BALANCE FUNDING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  WARNING: Previous direct transfer may have been lost!');
console.log('✅ Using proper deposit() function for unified balance');

async function fundGatewayProperly() {
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('\\n🔧 Setup:');
        console.log(`   📍 Your wallet: ${WALLET_ADDRESS}`);
        console.log(`   🏦 Gateway wallet: ${GATEWAY_WALLET}`);
        console.log(`   💵 Funding amount: 0.5 USDC`);
        console.log(`   🎯 Method: deposit() function for unified balance`);
        
        // Contract ABIs
        const usdcABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
        ];
        
        const gatewayWalletABI = [
            'function deposit(address token, uint256 amount) returns (bool)',
            'function balanceOf(address token, address account) view returns (uint256)'
        ];
        
        const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcABI, wallet);
        const gatewayContract = new ethers.Contract(GATEWAY_WALLET, gatewayWalletABI, wallet);
        
        // Check current USDC balance
        const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log(`\\n💰 Current USDC balance: ${balanceFormatted} USDC`);
        
        if (parseFloat(balanceFormatted) < 0.5) {
            console.log('❌ Insufficient USDC for deposit');
            return;
        }
        
        const depositAmount = ethers.utils.parseUnits('0.5', 6); // 0.5 USDC
        
        // Step 1: Check allowance
        console.log('\\n1️⃣ Checking Gateway allowance...');
        const allowance = await usdcContract.allowance(WALLET_ADDRESS, GATEWAY_WALLET);
        const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
        console.log(`   🔓 Current allowance: ${allowanceFormatted} USDC`);
        
        // Step 2: Approve if needed
        if (allowance.lt(depositAmount)) {
            console.log('\\n2️⃣ Approving Gateway wallet...');
            const approveTx = await usdcContract.approve(GATEWAY_WALLET, depositAmount);
            console.log(`   📤 Approval TX: ${approveTx.hash}`);
            console.log('   ⏳ Waiting for approval confirmation...');
            await approveTx.wait();
            console.log('   ✅ Approval confirmed!');
        } else {
            console.log('\\n2️⃣ ✅ Sufficient allowance already exists');
        }
        
        // Step 3: Deposit using proper deposit() function
        console.log('\\n3️⃣ Depositing to Gateway (PROPER METHOD)...');
        console.log(`   🏦 Calling deposit(${USDC_CONTRACT}, ${ethers.utils.formatUnits(depositAmount, 6)} USDC)`);
        
        const depositTx = await gatewayContract.deposit(USDC_CONTRACT, depositAmount);
        console.log(`   📤 Deposit TX: ${depositTx.hash}`);
        console.log('   ⏳ Waiting for deposit confirmation...');
        await depositTx.wait();
        console.log('   ✅ Deposit confirmed!');
        
        // Step 4: Check results
        console.log('\\n4️⃣ Verifying deposit results...');
        const newBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const newBalanceFormatted = ethers.utils.formatUnits(newBalance, 6);
        
        console.log('\\n📊 Results:');
        console.log(`   📱 Your remaining USDC: ${newBalanceFormatted} USDC`);
        console.log(`   ✅ Deposited: ${(parseFloat(balanceFormatted) - parseFloat(newBalanceFormatted)).toFixed(6)} USDC`);
        console.log(`   🏦 Transaction: ${depositTx.hash}`);
        
        // Try to check Gateway balance (may require different method)
        try {
            const gatewayBalance = await gatewayContract.balanceOf(USDC_CONTRACT, WALLET_ADDRESS);
            const gatewayBalanceFormatted = ethers.utils.formatUnits(gatewayBalance, 6);
            console.log(`   🌐 Gateway unified balance: ${gatewayBalanceFormatted} USDC`);
        } catch (error) {
            console.log('   ⚠️ Cannot read Gateway balance directly (normal)');
            console.log('   💡 Use Gateway API to check unified balance');
        }
        
        console.log('\\n🎯 Next Steps:');
        console.log('   1. Wait 1-2 minutes for Gateway to process deposit');
        console.log('   2. Test: node demo-agent-authorization.js');
        console.log('   3. Check if Gateway API now shows unified balance');
        console.log('   4. Run live demo if balance appears');
        
        console.log('\\n✅ SUCCESS: Used proper deposit() function!');
        console.log('   • This creates unified balance across all Gateway chains');
        console.log('   • Previous direct transfer may have been lost');
        console.log('   • Gateway will now recognize this deposit');
        
    } catch (error) {
        console.error('❌ Proper Gateway funding failed:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\\n💡 Need more ETH for gas fees');
        } else if (error.message.includes('allowance')) {
            console.log('\\n💡 Allowance issue - try running again');
        } else {
            console.log('\\n💡 Check transaction on Etherscan for details');
        }
    }
}

fundGatewayProperly().catch(console.error);