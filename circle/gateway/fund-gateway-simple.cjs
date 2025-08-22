// Simple Gateway wallet funding - Step 1 of demo
// Fund Gateway wallet with USDC for multi-chain transfers

const { ethers } = require('ethers');

console.log('💰 GATEWAY WALLET FUNDING - STEP 1');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Your wallet details
const PRIVATE_KEY = process.env.PRIVATE_KEY || 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';

// Ethereum mainnet addresses
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC on Ethereum mainnet
const GATEWAY_WALLET_CONTRACT = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'; // Gateway Wallet

// Amount to deposit (1 USDC = 1000000 with 6 decimals)
const DEPOSIT_AMOUNT = '1000000'; // 1 USDC

// Simple ABIs
const USDC_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

const GATEWAY_ABI = [
    'function deposit(address token, uint256 amount) returns (bool)'
];

async function fundGatewayWallet() {
    try {
        console.log('\n🔧 Setting up Ethereum connection...');
        console.log(`   📍 Your wallet: ${WALLET_ADDRESS}`);
        console.log(`   💵 Deposit amount: 1 USDC`);
        console.log(`   🏦 Gateway contract: ${GATEWAY_WALLET_CONTRACT}`);
        
        // Connect to Ethereum mainnet
        const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io');
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('   ✅ Connected to Ethereum mainnet');
        
        // Setup contracts
        const usdcContract = new ethers.Contract(USDC_CONTRACT, USDC_ABI, wallet);
        const gatewayContract = new ethers.Contract(GATEWAY_WALLET_CONTRACT, GATEWAY_ABI, wallet);
        
        // Step 1: Check USDC balance
        console.log('\n1️⃣ Checking your USDC balance...');
        const usdcBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const usdcBalanceFormatted = ethers.utils.formatUnits(usdcBalance, 6);
        
        console.log(`   💰 Your USDC balance: ${usdcBalanceFormatted} USDC`);
        
        if (usdcBalance.lt(DEPOSIT_AMOUNT)) {
            console.log('   ❌ Insufficient USDC balance for deposit');
            console.log(`   💡 You have: ${usdcBalanceFormatted} USDC`);
            console.log('   💡 Need: 1 USDC for Gateway deposit');
            return;
        }
        
        // Step 2: Check current allowance
        console.log('\n2️⃣ Checking Gateway allowance...');
        const currentAllowance = await usdcContract.allowance(WALLET_ADDRESS, GATEWAY_WALLET_CONTRACT);
        const allowanceFormatted = ethers.utils.formatUnits(currentAllowance, 6);
        
        console.log(`   🔓 Current allowance: ${allowanceFormatted} USDC`);
        
        // Step 3: Approve Gateway if needed
        if (currentAllowance.lt(DEPOSIT_AMOUNT)) {
            console.log('\n3️⃣ Approving Gateway to spend USDC...');
            console.log('   📝 Submitting approval transaction...');
            
            const approveTx = await usdcContract.approve(GATEWAY_WALLET_CONTRACT, DEPOSIT_AMOUNT);
            console.log(`   📤 Approval TX: ${approveTx.hash}`);
            console.log('   ⏳ Waiting for confirmation...');
            
            await approveTx.wait();
            console.log('   ✅ Approval confirmed!');
        } else {
            console.log('   ✅ Gateway already has sufficient allowance');
        }
        
        // Step 4: Deposit to Gateway
        console.log('\n4️⃣ Depositing USDC to Gateway wallet...');
        console.log('   💳 Submitting deposit transaction...');
        
        const depositTx = await gatewayContract.deposit(USDC_CONTRACT, DEPOSIT_AMOUNT);
        console.log(`   📤 Deposit TX: ${depositTx.hash}`);
        console.log('   ⏳ Waiting for confirmation...');
        
        const depositReceipt = await depositTx.wait();
        console.log('   ✅ Deposit confirmed!');
        
        // Step 5: Verify success
        console.log('\n5️⃣ Verifying Gateway deposit...');
        console.log('   🔍 Checking Gateway balance...');
        
        // Check new USDC balance
        const newUsdcBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const newUsdcFormatted = ethers.utils.formatUnits(newUsdcBalance, 6);
        
        console.log(`   💰 Your remaining USDC: ${newUsdcFormatted} USDC`);
        console.log(`   📊 Deposited: ${(parseFloat(usdcBalanceFormatted) - parseFloat(newUsdcFormatted)).toFixed(6)} USDC`);
        
        console.log('\n' + '═'.repeat(60));
        console.log('🎉 GATEWAY FUNDING COMPLETE!');
        console.log('');
        console.log('✅ SUCCESS SUMMARY:');
        console.log('   • 1 USDC deposited to Gateway wallet');
        console.log('   • Gateway ready for unified balance management');
        console.log('   • Multi-chain transfers now possible');
        console.log('   • Demo ready for execution');
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Test: node demo-agent-authorization.js');
        console.log('   2. Live: node demo-agent-authorization.js --live');
        console.log('   3. Execute real ZKP + Gateway 7-chain demo!');
        console.log('');
        console.log('💰 DEMO CAPACITY:');
        console.log('   • Can run ~14 demos (1 USDC ÷ 0.07 per demo)');
        console.log('   • Each demo: 0.01 USDC × 7 chains = 0.07 USDC');
        console.log('   • Gas fees: ~0.003 ETH per demo (~$9)');
        
    } catch (error) {
        console.error('\n❌ Gateway funding failed:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Solutions:');
            console.log('   1. Make sure you have ETH for gas fees');
            console.log('   2. Check USDC balance is sufficient');
            console.log('   3. Verify wallet has both ETH and USDC');
        } else if (error.message.includes('user rejected')) {
            console.log('\n💡 Transaction was rejected');
            console.log('   • Try running the command again');
            console.log('   • Make sure to approve the transaction');
        } else {
            console.log('\n💡 Error details:', error.code || 'Unknown error');
        }
    }
}

fundGatewayWallet().catch(console.error);