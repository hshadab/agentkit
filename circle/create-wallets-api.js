import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

async function createWallet(description, type = 'end_user_wallet') {
    console.log(`\n🔨 Creating ${description}...`);
    
    try {
        const response = await axios.post(
            `${API_URL}/wallets`,
            {
                idempotencyKey: uuidv4(),
                description: description,
                type: type
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`✅ Wallet created successfully!`);
        console.log(`   ID: ${response.data.data.walletId}`);
        console.log(`   Type: ${response.data.data.type}`);
        console.log(`   Description: ${response.data.data.description}`);
        
        return response.data.data;
    } catch (error) {
        console.error(`❌ Failed to create wallet:`, error.response?.data || error.message);
        
        // If error, try different parameters
        if (error.response?.data?.message?.includes('type')) {
            console.log('\n🔄 Retrying with minimal parameters...');
            
            try {
                const retryResponse = await axios.post(
                    `${API_URL}/wallets`,
                    {
                        idempotencyKey: uuidv4()
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                console.log(`✅ Wallet created with retry!`);
                console.log(`   ID: ${retryResponse.data.data.walletId}`);
                return retryResponse.data.data;
            } catch (retryError) {
                console.error(`❌ Retry also failed:`, retryError.response?.data || retryError.message);
            }
        }
        
        return null;
    }
}

async function createAddressForWallet(walletId, blockchain) {
    console.log(`\n🔗 Creating ${blockchain} address for wallet ${walletId}...`);
    
    try {
        const response = await axios.post(
            `${API_URL}/wallets/${walletId}/addresses`,
            {
                idempotencyKey: uuidv4(),
                currency: 'USD',
                chain: blockchain
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`✅ Address created: ${response.data.data.address}`);
        return response.data.data;
    } catch (error) {
        console.error(`❌ Failed to create address:`, error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Circle Wallet Creation via API\n');
    
    if (!API_KEY) {
        console.error('❌ CIRCLE_API_KEY not set');
        return;
    }
    
    console.log('📋 Current Status:');
    console.log(`API Key: ${API_KEY.substring(0, 30)}...`);
    
    // List current wallets first
    console.log('\n📊 Existing wallets:');
    try {
        const walletList = await axios.get(`${API_URL}/wallets`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        for (const wallet of walletList.data.data) {
            console.log(`- ${wallet.walletId}: ${wallet.type} (${wallet.description || 'No description'})`);
        }
    } catch (error) {
        console.error('Failed to list wallets:', error.message);
    }
    
    // Try to create wallets
    console.log('\n🔧 Attempting to create blockchain wallets...');
    
    const ethWallet = await createWallet('Agentkit ETH Wallet', 'end_user_wallet');
    const solWallet = await createWallet('Agentkit SOL Wallet', 'end_user_wallet');
    
    if (ethWallet) {
        await createAddressForWallet(ethWallet.walletId, 'ETH');
    }
    
    if (solWallet) {
        await createAddressForWallet(solWallet.walletId, 'SOL');
    }
    
    if (ethWallet || solWallet) {
        console.log('\n✅ Update your .env file with:');
        if (ethWallet) console.log(`CIRCLE_ETH_WALLET_ID=${ethWallet.walletId}`);
        if (solWallet) console.log(`CIRCLE_SOL_WALLET_ID=${solWallet.walletId}`);
    }
}

main().catch(console.error);