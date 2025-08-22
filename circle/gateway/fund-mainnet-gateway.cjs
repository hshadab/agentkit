// Fund Gateway wallet on MAINNET using CORRECT production contracts
const { ethers } = require('ethers');

// Mainnet Configuration with REAL production contracts
const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const MAINNET_RPC = 'https://eth-mainnet.public.blastapi.io';

// PRODUCTION Gateway Contracts (from Gateway API)
const MAINNET_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const GATEWAY_WALLET = '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE'; // ⭐ REAL PRODUCTION

console.log('🚀 MAINNET GATEWAY FUNDING - PRODUCTION CONTRACTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Using Ethereum mainnet (production)');
console.log('✅ Using REAL Gateway production contracts');
console.log('✅ Using proper deposit() function');

async function fundMainnetGateway() {
    try {
        console.log('\\n🔧 Setup:');
        console.log(`   📍 Your wallet: ${WALLET_ADDRESS}`);
        console.log(`   🌐 Network: Ethereum Mainnet`);
        console.log(`   🏦 PRODUCTION Gateway wallet: ${GATEWAY_WALLET}`);
        console.log(`   💵 Mainnet USDC: ${MAINNET_USDC}`);
        console.log(`   💰 Deposit amount: 0.5 USDC`);
        
        // Connect to Mainnet
        const provider = new ethers.providers.JsonRpcProvider(MAINNET_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('   ✅ Connected to Ethereum mainnet');
        
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
        
        const usdcContract = new ethers.Contract(MAINNET_USDC, usdcABI, wallet);
        const gatewayContract = new ethers.Contract(GATEWAY_WALLET, gatewayWalletABI, wallet);
        
        const depositAmount = ethers.utils.parseUnits('0.5', 6); // 0.5 USDC
        
        // Step 1: Check USDC balance
        console.log('\\n1️⃣ Checking mainnet USDC balance...');
        const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log(`   💰 Current USDC balance: ${balanceFormatted} USDC`);
        
        if (balance.lt(depositAmount)) {
            console.log('   ❌ Insufficient USDC for 0.5 USDC deposit');
            console.log(`   💡 You have: ${balanceFormatted} USDC`);
            console.log('   💡 Need: 0.5 USDC for Gateway deposit');
            return;
        }
        
        // Step 2: Check allowance
        console.log('\\n2️⃣ Checking Gateway allowance...');
        const allowance = await usdcContract.allowance(WALLET_ADDRESS, GATEWAY_WALLET);
        const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
        console.log(`   🔓 Current allowance: ${allowanceFormatted} USDC`);
        
        // Step 3: Approve if needed
        if (allowance.lt(depositAmount)) {
            console.log('\\n3️⃣ Approving PRODUCTION Gateway wallet...');
            console.log(`   📝 Approving ${ethers.utils.formatUnits(depositAmount, 6)} USDC...`);
            
            const approveTx = await usdcContract.approve(GATEWAY_WALLET, depositAmount);
            console.log(`   📤 Approval TX: ${approveTx.hash}`);
            console.log('   ⏳ Waiting for approval confirmation...');
            await approveTx.wait();
            console.log('   ✅ Approval confirmed!');
        } else {
            console.log('\\n3️⃣ ✅ Sufficient allowance already exists');
        }
        
        // Step 4: Deposit using proper deposit() function to PRODUCTION contract
        console.log('\\n4️⃣ Depositing to PRODUCTION Gateway...');
        console.log(`   🏦 Calling deposit(${MAINNET_USDC}, ${ethers.utils.formatUnits(depositAmount, 6)} USDC)`);
        console.log(`   🎯 To PRODUCTION contract: ${GATEWAY_WALLET}`);
        
        const depositTx = await gatewayContract.deposit(MAINNET_USDC, depositAmount);
        console.log(`   📤 Deposit TX: ${depositTx.hash}`);
        console.log('   ⏳ Waiting for deposit confirmation...');
        await depositTx.wait();
        console.log('   ✅ Deposit confirmed!');
        
        // Step 5: Check results
        console.log('\\n5️⃣ Verifying deposit results...');
        const newBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const newBalanceFormatted = ethers.utils.formatUnits(newBalance, 6);
        
        console.log('\\n📊 Results:');
        console.log(`   📱 Your remaining USDC: ${newBalanceFormatted} USDC`);
        console.log(`   ✅ Deposited: ${(parseFloat(balanceFormatted) - parseFloat(newBalanceFormatted)).toFixed(6)} USDC`);
        console.log(`   🏦 Mainnet TX: ${depositTx.hash}`);
        console.log(`   🔍 Explorer: https://etherscan.io/tx/${depositTx.hash}`);
        
        console.log('\\n🎯 Next Steps:');
        console.log('   1. Wait 1-2 minutes for Gateway to process');
        console.log('   2. Test: node demo-mainnet-gateway.js');
        console.log('   3. Check Gateway API unified balance');
        console.log('   4. Run live 7-chain MAINNET demo!');
        
        console.log('\\n✅ SUCCESS: MAINNET Gateway Funded!');
        console.log('   • Used PRODUCTION Ethereum mainnet');
        console.log('   • Used REAL Gateway production contracts');
        console.log('   • Used proper deposit() function');
        console.log('   • Gateway should recognize unified balance');
        console.log('   • Ready for 7-chain PRODUCTION demo');
        
        console.log('\\n🌐 Available for instant transfers:');
        console.log('   🔷 Ethereum, 🟦 Base, 🔺 Avalanche');
        console.log('   🔵 Arbitrum, 🔴 Optimism, 🟣 Polygon, 🦄 Unichain');
        
    } catch (error) {
        console.error('❌ Mainnet Gateway funding failed:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\\n💡 Need more ETH for gas fees');
        } else if (error.message.includes('allowance')) {
            console.log('\\n💡 Allowance issue - try running again');
        } else if (error.message.includes('revert')) {
            console.log('\\n💡 Contract revert - check contract address');
        } else {
            console.log('\\n💡 Check transaction on Etherscan for details');
        }
    }
}

fundMainnetGateway().catch(console.error);