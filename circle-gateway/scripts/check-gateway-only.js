async function checkGatewayBalance() {
    const response = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: "USDC",
            sources: [{ domain: 0, depositor: '0xE616B2eC620621797030E0AB1BA38DA68D78351C' }]
        })
    });
    
    const data = await response.json();
    console.log('Current Gateway Balance:', data.balances[0].balance, 'USDC');
    
    // Check wallet balance on Etherscan
    console.log('\nWallet USDC balance: Check https://sepolia.etherscan.io/address/0xE616B2eC620621797030E0AB1BA38DA68D78351C#tokentxns');
}

checkGatewayBalance().catch(console.error);
