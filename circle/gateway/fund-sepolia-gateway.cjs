// Fund Gateway wallet on Sepolia testnet using proper deposit() function
const { ethers } = require('ethers');

// Sepolia Configuration (from Circle docs)
const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const SEPOLIA_RPC = 'https://ethereum-sepolia.publicnode.com';

// Sepolia Gateway Contracts (from Circle documentation)
const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

console.log('💰 SEPOLIA GATEWAY FUNDING - PROPER METHOD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Using Sepolia testnet (correct network)');
console.log('✅ Using proper deposit() function');

async function fundSepoliaGateway() {
    try {
        console.log('\\n🔧 Setup:');
        console.log(`   📍 Your wallet: ${WALLET_ADDRESS}`);
        console.log(`   🌐 Network: Ethereum Sepolia`);
        console.log(`   🏦 Gateway wallet: ${GATEWAY_WALLET}`);
        console.log(`   💵 Sepolia USDC: ${SEPOLIA_USDC}`);
        console.log(`   💰 Deposit amount: 1.0 USDC`);
        
        // Connect to Sepolia
        const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('   ✅ Connected to Sepolia testnet');
        
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
        
        const usdcContract = new ethers.Contract(SEPOLIA_USDC, usdcABI, wallet);
        const gatewayContract = new ethers.Contract(GATEWAY_WALLET, gatewayWalletABI, wallet);
        
        const depositAmount = ethers.utils.parseUnits('1.0', 6); // 1 USDC
        
        // Step 1: Check USDC balance
        console.log('\\n1️⃣ Checking Sepolia USDC balance...');
        const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log(`   💰 Current USDC balance: ${balanceFormatted} USDC`);
        
        if (balance.lt(depositAmount)) {
            console.log('   ❌ Insufficient USDC for 1.0 USDC deposit');
            console.log('   🚰 Get more from: https://faucet.circle.com/');
            return;
        }
        
        // Step 2: Check allowance
        console.log('\\n2️⃣ Checking Gateway allowance...');
        const allowance = await usdcContract.allowance(WALLET_ADDRESS, GATEWAY_WALLET);
        const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
        console.log(`   🔓 Current allowance: ${allowanceFormatted} USDC`);
        
        // Step 3: Approve if needed
        if (allowance.lt(depositAmount)) {
            console.log('\\n3️⃣ Approving Gateway wallet...');
            console.log(`   📝 Approving ${ethers.utils.formatUnits(depositAmount, 6)} USDC...`);
            
            const approveTx = await usdcContract.approve(GATEWAY_WALLET, depositAmount);
            console.log(`   📤 Approval TX: ${approveTx.hash}`);
            console.log('   ⏳ Waiting for approval confirmation...');
            await approveTx.wait();
            console.log('   ✅ Approval confirmed!');
        } else {
            console.log('\\n3️⃣ ✅ Sufficient allowance already exists');
        }
        
        // Step 4: Deposit using proper deposit() function
        console.log('\\n4️⃣ Depositing to Gateway (PROPER METHOD)...');
        console.log(`   🏦 Calling deposit(${SEPOLIA_USDC}, ${ethers.utils.formatUnits(depositAmount, 6)} USDC)`);
        
        const depositTx = await gatewayContract.deposit(SEPOLIA_USDC, depositAmount);
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
        console.log(`   🏦 Sepolia TX: ${depositTx.hash}`);
        console.log(`   🔍 Explorer: https://sepolia.etherscan.io/tx/${depositTx.hash}`);
        
        console.log('\\n🎯 Next Steps:');
        console.log('   1. Wait 1-2 minutes for Gateway to process');
        console.log('   2. Test: node demo-sepolia-gateway.js');
        console.log('   3. Check Gateway API unified balance');
        console.log('   4. Run live 3-chain testnet demo!');
        
        console.log('\\n✅ SUCCESS: Sepolia Gateway Funded!');
        console.log('   • Used correct Sepolia testnet');
        console.log('   • Used proper deposit() function');
        console.log('   • Gateway should recognize unified balance');
        console.log('   • Ready for 3-chain testnet demo');
        
    } catch (error) {
        console.error('❌ Sepolia Gateway funding failed:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\\n💡 Need more Sepolia ETH for gas fees');
            console.log('   🚰 Get ETH: https://sepoliafaucet.com/');
        } else if (error.message.includes('allowance')) {
            console.log('\\n💡 Allowance issue - try running again');
        } else {
            console.log('\\n💡 Check transaction on Sepolia Etherscan');
        }
    }
}

fundSepoliaGateway().catch(console.error);