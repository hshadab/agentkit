import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function fundWallet() {
    const apiKey = process.env.CIRCLE_API_KEY;
    const walletId = process.env.CIRCLE_ETH_WALLET_ID;
    
    console.log('🚰 Requesting testnet USDC from Circle faucet...');
    console.log(`Wallet ID: ${walletId}`);
    
    try {
        // Circle sandbox provides test funds through the API
        const response = await axios.post(
            'https://api-sandbox.circle.com/v1/faucet/drips',
            {
                address: walletId,
                currency: 'USD',
                amount: '100',  // Request 100 USDC
                chain: 'ETH'
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Faucet response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('\n❌ Faucet endpoint not found.');
            console.log('\n📝 Manual funding instructions:');
            console.log('1. Visit Circle Sandbox Dashboard: https://app.circle.com/sandbox');
            console.log('2. Sign in with your sandbox account');
            console.log('3. Navigate to Wallets section');
            console.log(`4. Find wallet ${walletId}`);
            console.log('5. Click "Add Funds" or "Deposit"');
            console.log('6. Add testnet USDC to your wallet');
        } else {
            console.error('Error:', error.response?.data || error.message);
        }
    }
}

fundWallet();
