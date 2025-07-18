import dotenv from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment from parent directory
dotenv.config({ path: resolve('../.env') });

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

async function findBlockchainWallets() {
    console.log('🔍 Searching for blockchain wallets with addresses...\n');
    
    try {
        // First, get all wallets
        const walletsResponse = await axios.get(`${API_URL}/wallets`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const wallets = walletsResponse.data.data || [];
        console.log(`Found ${wallets.length} wallet(s)\n`);
        
        let ethWallet = null;
        let solWallet = null;
        let ethAddress = null;
        let solAddress = null;
        
        // For each wallet, get detailed info including addresses
        for (const wallet of wallets) {
            console.log(`\nWallet ID: ${wallet.walletId}`);
            console.log(`Type: ${wallet.type}`);
            
            // Get wallet details with addresses
            if (wallet.walletId && wallet.type !== 'merchant') {
                try {
                    const detailsResponse = await axios.get(`${API_URL}/wallets/${wallet.walletId}`, {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const walletDetails = detailsResponse.data.data || detailsResponse.data;
                    
                    // Check for addresses
                    if (walletDetails.addresses && walletDetails.addresses.length > 0) {
                        console.log('Addresses:');
                        for (const addr of walletDetails.addresses) {
                            console.log(`  - ${addr.chain}: ${addr.address}`);
                            
                            if (addr.chain === 'ETH' && !ethWallet) {
                                ethWallet = wallet.walletId;
                                ethAddress = addr.address;
                            } else if (addr.chain === 'SOL' && !solWallet) {
                                solWallet = wallet.walletId;
                                solAddress = addr.address;
                            }
                        }
                    }
                } catch (err) {
                    console.log(`  Could not fetch details: ${err.message}`);
                }
            }
        }
        
        // Check transaction example addresses
        console.log('\n📊 Transaction Analysis:');
        console.log('From Ethereum example: 0x75C0c372da875a4Fc78E8A37f58618a6D18904e8');
        console.log('This might be your Circle ETH wallet address');
        
        console.log('\n✅ Configuration Summary:');
        if (ethWallet) {
            console.log(`\nETH Wallet Found:`);
            console.log(`  Wallet ID: ${ethWallet}`);
            console.log(`  Address: ${ethAddress}`);
        } else {
            console.log('\n❌ No ETH blockchain wallet found');
            console.log('You may need to create one in Circle sandbox dashboard');
        }
        
        if (solWallet) {
            console.log(`\nSOL Wallet Found:`);
            console.log(`  Wallet ID: ${solWallet}`);
            console.log(`  Address: ${solAddress}`);
        } else {
            console.log('\n❌ No SOL blockchain wallet found');
            console.log('You may need to create one in Circle sandbox dashboard');
        }
        
        console.log('\n📝 Add these to your .env file:');
        console.log('```');
        if (ethWallet) console.log(`CIRCLE_ETH_WALLET_ID=${ethWallet}`);
        if (solWallet) console.log(`CIRCLE_SOL_WALLET_ID=${solWallet}`);
        if (!ethWallet && !solWallet) {
            console.log('# No blockchain wallets found - create them in Circle dashboard');
            console.log('# The merchant wallet (1017339334) cannot be used for blockchain transfers');
        }
        console.log('```');
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

findBlockchainWallets();