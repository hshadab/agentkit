const { ethers } = require('ethers');

async function depositToGateway() {
    // Configuration
    const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const RPC_URL = 'https://rpc.sepolia.org';
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    
    // Connect to network
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Wallet address:', wallet.address);
    
    // USDC contract ABI (minimal)
    const usdcABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
    ];
    
    // Gateway Wallet ABI (for deposit)
    const gatewayABI = [
        'function deposit(address token, uint256 amount) external'
    ];
    
    // Connect to contracts
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, wallet);
    const gatewayContract = new ethers.Contract(GATEWAY_WALLET, gatewayABI, wallet);
    
    try {
        // Check current balances
        const walletBalance = await usdcContract.balanceOf(wallet.address);
        const walletBalanceFormatted = ethers.utils.formatUnits(walletBalance, 6);
        console.log('Wallet USDC balance:', walletBalanceFormatted);
        
        // Check current Gateway balance via API
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: "USDC",
                sources: [{ domain: 0, depositor: wallet.address }]
            })
        });
        
        const data = await response.json();
        const currentGatewayBalance = parseFloat(data.balances[0].balance);
        console.log('Current Gateway balance:', currentGatewayBalance, 'USDC');
        
        // Deposit ALL available USDC from wallet
        const toDeposit = parseFloat(walletBalanceFormatted);
        
        if (toDeposit <= 0) {
            console.log('❌ No USDC available in wallet to deposit');
            return;
        }
        
        console.log('Depositing ALL available USDC:', toDeposit.toFixed(2), 'USDC');
        
        // Convert to USDC units (6 decimals)
        const depositAmount = ethers.utils.parseUnits(toDeposit.toFixed(6), 6);
        
        // Step 1: Approve Gateway to spend USDC
        console.log('\n📝 Step 1: Approving Gateway to spend USDC...');
        const currentAllowance = await usdcContract.allowance(wallet.address, GATEWAY_WALLET);
        
        if (currentAllowance.lt(depositAmount)) {
            const approveTx = await usdcContract.approve(GATEWAY_WALLET, depositAmount);
            console.log('Approval tx:', approveTx.hash);
            await approveTx.wait();
            console.log('✅ Approval confirmed');
        } else {
            console.log('✅ Already approved');
        }
        
        // Step 2: Deposit to Gateway
        console.log('\n💰 Step 2: Depositing to Gateway...');
        const depositTx = await gatewayContract.deposit(USDC_ADDRESS, depositAmount);
        console.log('Deposit tx:', depositTx.hash);
        console.log('Waiting for confirmation...');
        await depositTx.wait();
        
        console.log('✅ Deposit confirmed!');
        console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${depositTx.hash}`);
        
        // Wait a bit for Gateway to process
        console.log('\nWaiting 5 seconds for Gateway to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check new balance
        const newResponse = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: "USDC",
                sources: [{ domain: 0, depositor: wallet.address }]
            })
        });
        
        const newData = await newResponse.json();
        const newGatewayBalance = parseFloat(newData.balances[0].balance);
        console.log('\n✅ New Gateway balance:', newGatewayBalance, 'USDC');
        
        if (newGatewayBalance >= needed) {
            console.log('🎉 Success! Gateway now has sufficient balance for transfers');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.reason) console.error('Reason:', error.reason);
    }
}

// Run the deposit
depositToGateway().catch(console.error);