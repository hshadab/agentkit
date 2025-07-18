import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment from parent directory
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

// Wallet info from wallet-info.json
const WALLET_INFO = {
    apiKey: "TEST_API_KEY:92057e9c2a8b18adfe0bfaa994be920e:36a02396da55fc7cb508c4b533aa8637",
    entitySecret: "c5729c5ef63ce6fbf04daa0eb7479403342a7d0ac123abb2fc9ba38969c692ac",
    walletId: "da83113b-f48f-58a3-9115-31572ebfc127",
    address: "0x37b6c846ca0483a0fc6c7702707372ebcd131188",
    blockchain: "ETH-SEPOLIA",
    walletSetId: "7d0b7bbd-fac8-5de7-af8a-1f11d92be7f9",
    createdAt: "2025-06-18T02:06:52.721Z"
};

async function checkWallet() {
    console.log('🔍 Checking developer-controlled wallet configuration...\n');
    
    // Check if we can find this wallet
    try {
        const response = await axios.get(`${API_URL}/wallets/${WALLET_INFO.walletId}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Wallet found!');
        console.log('Wallet Details:', response.data);
        
        return true;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('❌ Wallet not found with current API key');
            console.log('\n📋 The wallet exists but was created with a different API key:');
            console.log(`   Original API Key: ${WALLET_INFO.apiKey.substring(0, 30)}...`);
            console.log(`   Current API Key: ${API_KEY ? API_KEY.substring(0, 30) + '...' : 'Not set'}`);
            
            console.log('\n💡 This wallet belongs to:');
            console.log(`   Wallet ID: ${WALLET_INFO.walletId}`);
            console.log(`   Address: ${WALLET_INFO.address}`);
            console.log(`   Blockchain: ${WALLET_INFO.blockchain}`);
            console.log(`   Created: ${WALLET_INFO.createdAt}`);
            
            console.log('\n🔧 Options:');
            console.log('1. Use the original API key from wallet-info.json');
            console.log('2. Create new wallets with your current API key');
            console.log('3. For developer-controlled wallets, you need the wallet set and entity secret');
            
            return false;
        }
        throw error;
    }
}

async function findAvailableWallets() {
    console.log('\n🔍 Searching for wallets with current API key...\n');
    
    try {
        const response = await axios.get(`${API_URL}/wallets`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const wallets = response.data.data || [];
        
        for (const wallet of wallets) {
            console.log(`Wallet ID: ${wallet.walletId}`);
            console.log(`  Type: ${wallet.type}`);
            
            // Get detailed info
            try {
                const details = await axios.get(`${API_URL}/wallets/${wallet.walletId}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (details.data.data?.addresses) {
                    for (const addr of details.data.data.addresses) {
                        console.log(`  ${addr.chain}: ${addr.address}`);
                    }
                }
            } catch (e) {
                // Skip if can't get details
            }
            console.log('---');
        }
        
    } catch (error) {
        console.error('Error finding wallets:', error.message);
    }
}

async function main() {
    console.log('🚀 Circle Developer Wallets Setup Check\n');
    
    if (!API_KEY) {
        console.error('❌ CIRCLE_API_KEY not set in environment');
        return;
    }
    
    // Check if the wallet from wallet-info.json is accessible
    const walletFound = await checkWallet();
    
    if (!walletFound) {
        // Find what wallets we do have access to
        await findAvailableWallets();
    }
    
    console.log('\n📝 Configuration Recommendations:');
    console.log('For developer-controlled wallets, you need:');
    console.log('1. Create wallet sets in Circle sandbox dashboard');
    console.log('2. Store the entity secret securely');
    console.log('3. Use the developer-controlled wallets SDK');
    console.log('\nOr use standard blockchain wallets as currently implemented.');
}

main().catch(console.error);