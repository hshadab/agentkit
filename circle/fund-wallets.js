import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

async function fundWallet(fromWalletId, toWalletId, amount, description) {
    console.log(`\n💰 Funding ${description} with ${amount} USD...`);
    
    try {
        const response = await axios.post(
            `${API_URL}/transfers`,
            {
                idempotencyKey: uuidv4(),
                source: {
                    type: 'wallet',
                    id: fromWalletId
                },
                destination: {
                    type: 'wallet',
                    id: toWalletId
                },
                amount: {
                    amount: amount.toString(),
                    currency: 'USD'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`✅ Transfer initiated!`);
        console.log(`   Transfer ID: ${response.data.data.id}`);
        console.log(`   Status: ${response.data.data.status}`);
        
        return response.data.data;
    } catch (error) {
        console.error(`❌ Failed to fund wallet:`, error.response?.data || error.message);
        return null;
    }
}

async function convertToUSDC(walletId, amount, blockchain) {
    console.log(`\n🔄 Converting ${amount} USD to USDC on ${blockchain}...`);
    
    try {
        // For sandbox, we might need to use a different approach
        // Circle sandbox typically provides test USDC directly
        console.log('ℹ️  Note: In Circle sandbox, you may need to:');
        console.log('   1. Go to https://app-sandbox.circle.com/');
        console.log('   2. Navigate to your wallet');
        console.log('   3. Click "Add Funds" to add test USDC');
        console.log('   4. Or use the API endpoint if available');
        
        // Try to add test funds if there's an endpoint
        const response = await axios.post(
            `${API_URL}/mocks/payments/cards`,
            {
                idempotencyKey: uuidv4(),
                keyId: 'key1',
                encryptedData: 'LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCg==',
                billingDetails: {
                    name: 'Test User',
                    city: 'Boston',
                    country: 'US',
                    line1: '100 Money Street',
                    postalCode: '01234'
                },
                metadata: {
                    email: 'test@circle.com',
                    sessionId: 'xxx',
                    ipAddress: '127.0.0.1'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Card created:', response.data);
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('ℹ️  Mock endpoints not available in this environment');
        } else {
            console.error('Error:', error.response?.data || error.message);
        }
    }
}

async function main() {
    console.log('🚀 Circle Wallet Funding\n');
    
    const merchantWalletId = '1017339334';
    const ethWalletId = process.env.CIRCLE_ETH_WALLET_ID;
    const solWalletId = process.env.CIRCLE_SOL_WALLET_ID;
    
    console.log('📊 Current Setup:');
    console.log(`Merchant Wallet: ${merchantWalletId} (has $16.79 USD)`);
    console.log(`ETH Wallet: ${ethWalletId}`);
    console.log(`SOL Wallet: ${solWalletId}`);
    
    // Fund wallets with USD from merchant wallet
    await fundWallet(merchantWalletId, ethWalletId, '8.00', 'ETH wallet');
    await fundWallet(merchantWalletId, solWalletId, '8.00', 'SOL wallet');
    
    console.log('\n📝 Next Steps:');
    console.log('1. The wallets now have USD balance');
    console.log('2. To get USDC for blockchain transfers:');
    console.log('   - Go to https://app-sandbox.circle.com/');
    console.log('   - Navigate to each wallet');
    console.log('   - Use "Add Funds" to add test USDC on the respective chains');
    console.log('3. Or check if there are API endpoints for adding test USDC');
}

main().catch(console.error);