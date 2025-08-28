const { ethers } = require('ethers');

async function transferAll() {
    try {
        // Manual provider configuration for Sepolia
        const provider = new ethers.providers.StaticJsonRpcProvider(
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                skipFetchSetup: true
            },
            11155111  // Sepolia chainId
        );
        
        const wallet = new ethers.Wallet(
            '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab',
            provider
        );
        
        console.log('Wallet address:', wallet.address);
        
        const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
        const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
        
        const abi = [
            'function balanceOf(address) view returns (uint256)',
            'function transfer(address, uint256) returns (bool)'
        ];
        
        const usdc = new ethers.Contract(USDC_ADDRESS, abi, wallet);
        
        console.log('Checking balance...');
        const balance = await usdc.balanceOf(wallet.address);
        const formatted = ethers.utils.formatUnits(balance, 6);
        console.log('Current USDC balance:', formatted, 'USDC');
        
        if (!balance.isZero()) {
            console.log('\nTransferring', formatted, 'USDC to Gateway...');
            const tx = await usdc.transfer(GATEWAY_WALLET, balance, {
                gasLimit: 100000
            });
            console.log('Transaction sent!');
            console.log('TX Hash:', tx.hash);
            console.log('View: https://sepolia.etherscan.io/tx/' + tx.hash);
            
            console.log('\nWaiting for confirmation...');
            const receipt = await tx.wait();
            console.log('✅ Transfer confirmed in block', receipt.blockNumber);
            
            // Check Gateway balance after
            setTimeout(async () => {
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
                console.log('\n🎉 New Gateway balance:', data.balances[0].balance, 'USDC');
            }, 5000);
            
        } else {
            console.log('No USDC to transfer');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

transferAll();
