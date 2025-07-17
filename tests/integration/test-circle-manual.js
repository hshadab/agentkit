import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

async function testCircleAPI() {
    const apiKey = process.env.CIRCLE_API_KEY;
    const walletId = process.env.CIRCLE_ETH_WALLET_ID;
    
    console.log('Testing Circle API directly...');
    console.log('API Key:', apiKey.substring(0, 20) + '...');
    console.log('Wallet ID:', walletId);
    
    // Test 1: Get wallet
    try {
        console.log('\n1. Testing wallet fetch...');
        const walletResponse = await axios.get(
            `https://api-sandbox.circle.com/v1/wallets/${walletId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Wallet details:', JSON.stringify(walletResponse.data, null, 2));
    } catch (error) {
        console.error('Wallet fetch error:', error.response?.data || error.message);
    }
    
    // Test 2: Create transfer
    try {
        console.log('\n2. Testing transfer creation...');
        const transferData = {
            idempotencyKey: uuidv4(),
            source: {
                type: 'wallet',
                id: walletId
            },
            destination: {
                type: 'blockchain',
                address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                chain: 'ETH'
            },
            amount: {
                amount: '0.01',
                currency: 'USD'
            }
        };
        
        console.log('Transfer request:', JSON.stringify(transferData, null, 2));
        
        const transferResponse = await axios.post(
            'https://api-sandbox.circle.com/v1/transfers',
            transferData,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Transfer response:', JSON.stringify(transferResponse.data, null, 2));
    } catch (error) {
        console.error('Transfer error:', error.response?.data || error.message);
    }
}

testCircleAPI();
