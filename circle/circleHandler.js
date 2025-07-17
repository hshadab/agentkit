import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { resolveRecipient } from './recipientResolver.js';

dotenv.config();

class CircleHandlerFixed {
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

            console.log('✅ Circle Handler initialized');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize Circle Handler:', error.message);
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

            // Resolve recipient address
            const resolvedAddress = resolveRecipient(recipientAddress, blockchain);
            console.log(`💸 Initiating ${amount} USDC transfer to ${resolvedAddress} on ${blockchain}`);
            
            if (resolvedAddress !== recipientAddress) {
                console.log(`   (Resolved "${recipientAddress}" to ${resolvedAddress})`);
            }

            // Create idempotency key
            const idempotencyKey = uuidv4();
            
            const transferRequest = {
                idempotencyKey: idempotencyKey,
                source: {
                    type: 'wallet',
                    id: walletId
                },
                destination: {
                    type: 'blockchain',
                    address: resolvedAddress,
                    chain: blockchain === 'SOL' ? 'SOL' : 'ETH'
                },
                amount: {
                    amount: amount.toString(),
                    currency: 'USD'
                }
            };

            console.log('📤 Sending transfer request to Circle API...');
            console.log('Request details:', {
                walletId: walletId,
                chain: transferRequest.destination.chain,
                address: recipientAddress
            });
            
            const response = await axios.post(
                `${this.baseURL}/v1/transfers`,
                transferRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            const transferData = response.data?.data || response.data;
            
            console.log('📥 Circle API Response:', {
                id: transferData.id,
                status: transferData.status,
                chain: blockchain
            });

            // For Solana, implement aggressive polling
            if (blockchain === 'SOL' && transferData.status === 'pending') {
                console.log('🔄 Starting aggressive polling for Solana transfer...');
                this.aggressivelyPollSolanaTransfer(transferData.id);
            }

            return {
                success: true,
                transferId: transferData.id,
                status: transferData.status,
                amount: amount,
                recipient: recipientAddress,
                blockchain: blockchain
            };

        } catch (error) {
            console.error('❌ Transfer failed:', error.message);
            if (error.response) {
                console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
                console.error('Status Code:', error.response.status);
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
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            
            const data = response.data?.data || response.data;
            
            // Log full response for Solana transfers
            if (data.destination?.chain === 'SOL') {
                console.log('🔍 Full Solana transfer response:', JSON.stringify(data, null, 2));
            }
            
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('❌ Failed to get transfer status:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async aggressivelyPollSolanaTransfer(transferId) {
        console.log(`🚀 Aggressively polling Solana transfer ${transferId}`);
        
        let attempts = 0;
        const maxAttempts = 60; // Poll for up to 10 minutes
        
        const pollInterval = setInterval(async () => {
            attempts++;
            
            try {
                const status = await this.getTransferStatus(transferId);
                
                if (status.success) {
                    const transfer = status.data;
                    
                    // Check all possible fields for transaction hash
                    const txHash = transfer.transactionHash || 
                                  transfer.txHash || 
                                  transfer.transactionId ||
                                  transfer.blockchainTxId ||
                                  transfer.solanaSignature ||
                                  (transfer.transactionDetails && transfer.transactionDetails.transactionHash);
                    
                    if (txHash) {
                        console.log(`✅ Solana transaction hash obtained after ${attempts} attempts: ${txHash}`);
                        console.log(`🔗 View on explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
                        clearInterval(pollInterval);
                    } else if (transfer.status === 'complete') {
                        console.log(`✅ Solana transfer complete but no tx hash available`);
                        clearInterval(pollInterval);
                    } else if (transfer.status === 'failed') {
                        console.log(`❌ Solana transfer failed: ${transfer.errorMessage || 'Unknown error'}`);
                        clearInterval(pollInterval);
                    }
                    
                    // Log status every 10 attempts
                    if (attempts % 10 === 0) {
                        console.log(`📊 Still polling... Attempt ${attempts}/${maxAttempts}, Status: ${transfer.status}`);
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.log(`⏰ Max polling attempts reached for Solana transfer`);
                    clearInterval(pollInterval);
                }
            } catch (error) {
                console.error(`Error polling transfer ${transferId}:`, error.message);
            }
        }, 10000); // Poll every 10 seconds
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

// Export the class
export default CircleHandlerFixed;

// Create a singleton instance for convenience
const defaultHandler = new CircleHandlerFixed();

// Export convenience functions
export async function transferUSDC(amount, recipientAddress, blockchain = 'ETH') {
    return await defaultHandler.transfer(amount, recipientAddress, blockchain);
}

export async function checkTransferStatus(transferId) {
    return await defaultHandler.getTransferStatus(transferId);
}

export async function getWalletInfo(walletId) {
    return await defaultHandler.getWallet(walletId);
}

export async function initializeCircle() {
    return await defaultHandler.initialize();
}