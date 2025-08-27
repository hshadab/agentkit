const { ethers } = require('ethers');

async function depositAllToGateway() {
    // Configuration
    const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    
    // Use Alchemy/Infura for better reliability
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Wallet:', wallet.address);
    
    // USDC contract
    const usdcABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function transfer(address to, uint256 amount) returns (bool)'
    ];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcABI, wallet);
    
    try {
        // Get wallet balance
        const balance = await usdcContract.balanceOf(wallet.address);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log('Current USDC balance:', balanceFormatted, 'USDC');
        
        if (balance.isZero()) {
            console.log('No USDC to deposit');
            return;
        }
        
        // Since Gateway deposit might not work, just transfer directly
        console.log('\n💸 Transferring all USDC to Gateway Wallet...');
        console.log('Amount:', balanceFormatted, 'USDC');
        
        const tx = await usdcContract.transfer(GATEWAY_WALLET, balance);
        console.log('Transaction sent:', tx.hash);
        console.log('View: https://sepolia.etherscan.io/tx/' + tx.hash);
        
        console.log('\nWaiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transfer confirmed in block:', receipt.blockNumber);
        
        // Check new balance
        const newBalance = await usdcContract.balanceOf(wallet.address);
        console.log('New wallet balance:', ethers.utils.formatUnits(newBalance, 6), 'USDC');
        
        // Check Gateway balance
        console.log('\nChecking Gateway balance via API...');
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
        if (data.balances && data.balances[0]) {
            console.log('Gateway balance:', data.balances[0].balance, 'USDC');
        }
        
        console.log('\n🎉 Done! All USDC transferred to Gateway');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

depositAllToGateway().catch(console.error);