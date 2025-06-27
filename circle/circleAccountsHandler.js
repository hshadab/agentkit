import pkg from '@circle-fin/circle-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

class CircleAccountsHandler {
    constructor() {
        this.apiKey = process.env.CIRCLE_API_KEY;
        this.baseURL = 'https://api-sandbox.circle.com/v1';
    }

    async createTransfer(amount, recipientAddress, blockchain = 'ETH') {
        try {
            console.log(`📤 Creating ${blockchain} transfer...`);
            
            const transferRequest = {
                idempotencyKey: uuidv4(),
                source: {
                    type: 'wallet',
                    id: process.env.CIRCLE_WALLET_ID
                },
                destination: {
                    type: 'blockchain',
                    address: recipientAddress,
                    chain: blockchain
                },
                amount: {
                    amount: amount.toString(),
                    currency: 'USD'
                }
            };

            console.log('Transfer request:', transferRequest);
            
            // Make direct API call
            const response = await fetch(`${this.baseURL}/transfers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(transferRequest)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `API error: ${response.status}`);
            }
            
            console.log('✅ Transfer created!');
            console.log('  Transfer ID:', data.data?.id);
            console.log('  Status:', data.data?.status);
            
            return data.data;
            
        } catch (error) {
            console.error('Transfer error:', error.message);
            throw error;
        }
    }
}

export default CircleAccountsHandler;
