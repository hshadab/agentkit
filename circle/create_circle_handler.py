#!/usr/bin/env python3

circle_handler_content = '''import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

class CircleHandler {
    constructor() {
        this.apiKey = process.env.CIRCLE_API_KEY;
        this.baseURL = 'https://api-sandbox.circle.com';
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            if (!this.apiKey) {
                throw new Error('CIRCLE_API_KEY not found in environment variables');
            }

            console.log('✅ Circle SDK initialized and connected');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize Circle SDK:', error.message);
            throw error;
        }
    }

    async transfer(amount, recipientAddress, blockchain = 'ETH') {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const walletId = blockchain === 'SOL'
                ? process.env.CIRCLE_SOL_WALLET_ID
                : process.env.CIRCLE_ETH_WALLET_ID;

            if (!walletId) {
                throw new Error(`No wallet ID configured for ${blockchain}`);
            }

            console.log(`💸 Initiating ${amount} USDC transfer to ${recipientAddress} on ${blockchain}`);

            const transferRequest = {
                idempotencyKey: uuidv4(),
                source: {
                    type: 'wallet',
                    id: walletId
                },
                destination: {
                    type: 'blockchain',
                    address: recipientAddress,
                    chain: blockchain === 'SOL' ? 'SOL' : 'ETH'
                },
                amount: {
                    amount: amount.toString(),
                    currency: 'USD'
                }
            };

            console.log('📤 Sending transfer request to Circle API...');
            
            const response = await axios.post(
                `${this.baseURL}/v1/transfers`,
                transferRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('📥 Circle API Response:', {
                id: response.data?.data?.id || response.data?.id,
                status: response.data?.data?.status || response.data?.status,
                transactionHash: response.data?.data?.transactionHash || 'pending'
            });

            return {
                success: true,
                transferId: response.data?.data?.id || response.data?.id,
                status: response.data?.data?.status || response.data?.status,
                amount: amount,
                recipient: recipientAddress,
                blockchain: blockchain
            };

        } catch (error) {
            console.error('❌ Transfer failed:', error.message);
            if (error.response) {
                console.error('API Error Details:', error.response.data);
            }
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async getTransferStatus(transferId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const response = await axios.get(
                `${this.baseURL}/v1/transfers/${transferId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('❌ Failed to get transfer status:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getWallet(walletId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const response = await axios.get(
                `${this.baseURL}/v1/wallets/${walletId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data.data;
        } catch (error) {
            console.error('❌ Failed to get wallet:', error.message);
            throw error;
        }
    }
}

export default CircleHandler;
'''

# Write the file
with open('/home/hshadab/agentkit/circle/circleHandler.js', 'w') as f:
    f.write(circle_handler_content)

print("✅ Created circleHandler.js successfully!")
