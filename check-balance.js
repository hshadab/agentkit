const { ethers } = require('ethers');

async function checkBalance() {
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
    const wallet = new ethers.Wallet('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab', provider);
    
    const usdcContract = new ethers.Contract(
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        ['function balanceOf(address) view returns (uint256)'],
        provider
    );
    
    const balance = await usdcContract.balanceOf(wallet.address);
    console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6));
    
    // Check Gateway balance
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
    console.log('Gateway Balance:', data.balances[0].balance);
}

checkBalance().catch(console.error);
