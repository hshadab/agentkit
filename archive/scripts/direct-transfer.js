const { ethers } = require('ethers');

async function transferAllToGateway() {
    const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0xYOUR_TEST_PRIVATE_KEY';
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    
    // Use Infura public endpoint
    const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/3f4e6a46e91e4cd88f56a3f9e3f3e3f3');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Wallet:', wallet.address);
    console.log('Transferring to Gateway:', GATEWAY_WALLET);
    
    const usdcABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)'
    ];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, wallet);
    
    try {
        // Get wallet balance
        const balance = await usdcContract.balanceOf(wallet.address);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log('\nCurrent wallet USDC balance:', balanceFormatted, 'USDC');
        
        if (balance.isZero()) {
            console.log('No USDC to transfer');
            return;
        }
        
        // Transfer all USDC
        console.log('\n💸 Transferring all USDC to Gateway...');
        const tx = await usdcContract.transfer(GATEWAY_WALLET, balance);
        console.log('Transaction sent:', tx.hash);
        console.log('View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
        
        console.log('\nWaiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transfer confirmed in block:', receipt.blockNumber);
        
        // Check new balance
        const newBalance = await usdcContract.balanceOf(wallet.address);
        console.log('\nNew wallet balance:', ethers.utils.formatUnits(newBalance, 6), 'USDC (should be 0)');
        
    } catch (error) {
        console.error('Error:', error.message);
        // Try with a different RPC
        console.log('\nRetrying with different RPC...');
    }
}

transferAllToGateway().catch(console.error);
