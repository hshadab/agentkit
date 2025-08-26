import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function listWallets() {
    try {
        const response = await fetch(
            'https://api-sandbox.circle.com/v1/wallets',
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        console.log('All Circle Wallets:\n');
        
        if (data.data) {
            data.data.forEach(wallet => {
                console.log(`Wallet ID: ${wallet.walletId}`);
                console.log(`  Type: ${wallet.type}`);
                console.log(`  Blockchain: ${wallet.blockchain || 'N/A'}`);
                console.log(`  Address: ${wallet.address}`);
                console.log(`  Balances:`, wallet.balances);
                console.log('---');
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listWallets();
