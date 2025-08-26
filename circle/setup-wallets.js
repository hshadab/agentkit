import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment from parent directory
dotenv.config({ path: resolve('../.env') });

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

async function listWallets() {
    console.log('🔍 Searching for existing wallets...\n');
    
    const response = await fetch(`${API_URL}/wallets`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    
    let ethWallet = null;
    let solWallet = null;
    let merchantWallet = null;
    
    for (const wallet of data.data || []) {
        console.log(`Wallet ID: ${wallet.walletId}`);
        console.log(`  Type: ${wallet.type}`);
        
        // Check addresses for blockchain type
        if (wallet.addresses && wallet.addresses.length > 0) {
            for (const addr of wallet.addresses) {
                console.log(`  Blockchain: ${addr.chain}`);
                console.log(`  Address: ${addr.address}`);
                
                if (addr.chain === 'ETH') {
                    ethWallet = wallet.walletId;
                } else if (addr.chain === 'SOL') {
                    solWallet = wallet.walletId;
                }
            }
        } else if (wallet.type === 'merchant') {
            merchantWallet = wallet.walletId;
            console.log(`  Currency: USD (merchant wallet)`);
        }
        
        console.log('---');
    }
    
    console.log('\n📋 Summary:');
    console.log(`Ethereum Wallet ID: ${ethWallet || 'Not found'}`);
    console.log(`Solana Wallet ID: ${solWallet || 'Not found'}`);
    console.log(`Merchant Wallet ID: ${merchantWallet || 'Not found'}`);
    
    console.log('\n✅ Add these to your .env file:');
    if (ethWallet) {
        console.log(`CIRCLE_ETH_WALLET_ID=${ethWallet}`);
    }
    if (solWallet) {
        console.log(`CIRCLE_SOL_WALLET_ID=${solWallet}`);
    }
    
    if (!ethWallet || !solWallet) {
        console.log('\n⚠️  Missing wallets! You may need to create them.');
        console.log('Circle sandbox wallets need to be created through their dashboard.');
    }
}

listWallets().catch(console.error);