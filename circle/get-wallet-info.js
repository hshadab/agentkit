import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const circle = new Circle(process.env.CIRCLE_API_KEY, CircleEnvironments.sandbox);

console.log('🔍 Fetching your Circle wallets...\n');

try {
    // List all wallets
    const response = await circle.wallets.listWallets();
    const wallets = response.data?.data || [];
    
    console.log(`Found ${wallets.length} wallets:\n`);
    
    wallets.forEach((wallet, index) => {
        console.log(`Wallet ${index + 1}:`);
        console.log(`  ID: ${wallet.walletId}`);
        console.log(`  Entity ID: ${wallet.entityId}`);
        console.log(`  Type: ${wallet.type}`);
        console.log(`  Description: ${wallet.description || 'N/A'}`);
        
        if (wallet.balances && wallet.balances.length > 0) {
            console.log('  Balances:');
            wallet.balances.forEach(balance => {
                console.log(`    ${balance.currency}: ${balance.amount}`);
            });
        }
        
        if (wallet.addresses && wallet.addresses.length > 0) {
            console.log('  Addresses:');
            wallet.addresses.forEach(addr => {
                console.log(`    ${addr.chain}: ${addr.address}`);
            });
        }
        
        console.log('---');
    });
    
    // Update .env suggestion
    if (wallets.length > 0) {
        const firstWallet = wallets[0];
        console.log('\n📝 Update your .env with these values:');
        console.log(`CIRCLE_ETH_WALLET_ID=${firstWallet.walletId}`);
        console.log(`CIRCLE_SOL_WALLET_ID=${firstWallet.walletId}`);
        
        // Find addresses
        const ethAddr = firstWallet.addresses?.find(a => a.chain === 'ETH')?.address;
        const solAddr = firstWallet.addresses?.find(a => a.chain === 'SOL')?.address;
        
        if (ethAddr) console.log(`CIRCLE_ETH_WALLET_ADDRESS=${ethAddr}`);
        if (solAddr) console.log(`CIRCLE_SOL_WALLET_ADDRESS=${solAddr}`);
    }
    
} catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
        console.error('Details:', error.response.data);
    }
}

process.exit(0);
