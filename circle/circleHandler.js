// circleHandler.js - Complete Circle API Integration with Transaction Hash Handling
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CircleUSDCHandler {
    constructor() {
        this.apiKey = process.env.CIRCLE_API_KEY;
        this.environment = process.env.CIRCLE_ENVIRONMENT || 'sandbox';
        this.ethWalletId = process.env.CIRCLE_ETH_WALLET_ID;
        this.solWalletId = process.env.CIRCLE_SOL_WALLET_ID;
        this.ethWalletAddress = process.env.CIRCLE_ETH_WALLET_ADDRESS;
        this.solWalletAddress = process.env.CIRCLE_SOL_WALLET_ADDRESS;
        this.initialized = false;
        this.circle = null;
        this.transferHistory = [];
        this.loadTransferHistory();
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing Circle USDC Handler...');
        
        if (!this.apiKey) {
            console.warn('⚠️  CIRCLE_API_KEY not found - running in simulation mode');
            this.simulationMode = true;
            this.initialized = true;
            return;
        }
        
        try {
            // Initialize Circle SDK
            this.circle = new Circle(
                this.apiKey,
                this.environment === 'production' 
                    ? CircleEnvironments.production 
                    : CircleEnvironments.sandbox
            );
            
            // Test the connection with the correct method
            const testResponse = await this.circle.wallets.listWallets();
            console.log('✅ Circle SDK initialized and connected');
            this.simulationMode = false;
            
        } catch (error) {
            console.error('❌ Circle SDK initialization failed:', error.message);
            console.warn('⚠️  Falling back to simulation mode');
            this.simulationMode = true;
        }
        
        this.initialized = true;
    }

    loadTransferHistory() {
        try {
            const historyPath = path.join(__dirname, 'transfer_history.json');
            if (fs.existsSync(historyPath)) {
                this.transferHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading transfer history:', error);
            this.transferHistory = [];
        }
    }

    saveTransferHistory() {
        try {
            const historyPath = path.join(__dirname, 'transfer_history.json');
            fs.writeFileSync(historyPath, JSON.stringify(this.transferHistory, null, 2));
        } catch (error) {
            console.error('Error saving transfer history:', error);
        }
    }

    generateMockTransactionHash(blockchain) {
        if (blockchain === 'SOL') {
            // Solana transaction signatures are base58 encoded and typically 88 characters
            const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            let result = '';
            for (let i = 0; i < 88; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        } else {
            // Ethereum transaction hashes are 66 characters (0x + 64 hex chars)
            return '0x' + Array.from({length: 64}, () => 
                Math.floor(Math.random() * 16).toString(16)
            ).join('');
        }
    }

    async transferUSDC(amount, recipientAddress, isKYCVerified = false, blockchain = 'ETH') {
        if (!this.initialized) await this.initialize();

        console.log(`💸 Initiating ${amount} USDC transfer to ${recipientAddress} on ${blockchain}`);
        
        // Simulation mode for when Circle API is not available
        if (this.simulationMode) {
            console.log('📌 Running in simulation mode');
            const mockTxHash = this.generateMockTransactionHash(blockchain);
            const transferId = uuidv4();
            
            const transfer = {
                id: transferId,
                transferId: transferId,
                transactionHash: mockTxHash,
                amount: amount.toString(),
                recipient: recipientAddress,
                from: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress,
                blockchain: blockchain,
                status: 'complete',
                timestamp: new Date().toISOString(),
                isKYCVerified: isKYCVerified,
                simulated: true
            };
            
            this.transferHistory.push(transfer);
            this.saveTransferHistory();
            
            return {
                success: true,
                ...transfer,
                hash: mockTxHash,
                txHash: mockTxHash
            };
        }
        
        // Real Circle API transfer
        const sourceWalletId = blockchain === 'SOL' ? this.solWalletId : this.ethWalletId;
        const idempotencyKey = uuidv4();
        
        try {
            // Create transfer request
            const transferRequest = {
                idempotencyKey: idempotencyKey,
                source: {
                    type: 'wallet',
                    id: sourceWalletId
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
            const response = await this.circle.transfers.createTransfer(transferRequest);
            
            const transfer = response.data?.data || response.data;
            console.log('📥 Circle API Response:', {
                id: transfer.id,
                status: transfer.status,
                transactionHash: transfer.transactionHash || 'pending'
            });
            
            // Store transfer record
            const transferRecord = {
                id: transfer.id,
                transferId: transfer.id,
                amount: amount.toString(),
                recipient: recipientAddress,
                from: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress,
                blockchain: blockchain,
                status: transfer.status,
                timestamp: new Date().toISOString(),
                isKYCVerified: isKYCVerified,
                circleTransferId: transfer.id,
                transactionHash: transfer.transactionHash || null,
                idempotencyKey: idempotencyKey
            };
            
            this.transferHistory.push(transferRecord);
            this.saveTransferHistory();
            
            console.log(`✅ Transfer initiated with ID: ${transfer.id}`);
            
            // IMPORTANT: Don't return transaction hash if we don't have it yet
            // Return 'pending' to signal that polling is needed
            return {
                success: true,
                id: transfer.id,
                transferId: transfer.id,
                circleTransferId: transfer.id,
                transactionHash: transfer.transactionHash || 'pending',
                hash: transfer.transactionHash || 'pending',
                txHash: transfer.transactionHash || 'pending',
                amount: amount.toString(),
                recipient: recipientAddress,
                from: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress,
                blockchain: blockchain,
                status: transfer.status
            };
            
        } catch (error) {
            console.error('❌ Circle transfer failed:', error);
            
            if (error.response && error.response.data) {
                console.error('Circle API Error Details:', JSON.stringify(error.response.data, null, 2));
                
                // Common errors and their meanings
                if (error.response.data.code === 'insufficient_funds') {
                    throw new Error('Insufficient USDC balance in wallet');
                } else if (error.response.data.code === 'invalid_address') {
                    throw new Error('Invalid recipient address for ' + blockchain);
                }
            }
            
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    async getTransferDetails(transferId) {
        if (!this.initialized) await this.initialize();
        
        if (this.simulationMode) {
            // Return from local history in simulation mode
            const transfer = this.transferHistory.find(t => t.id === transferId);
            if (transfer) {
                // Simulate getting transaction hash after a delay
                if (!transfer.transactionHash || transfer.transactionHash === 'pending') {
                    transfer.transactionHash = this.generateMockTransactionHash(transfer.blockchain);
                    this.saveTransferHistory();
                }
                return transfer;
            }
            throw new Error('Transfer not found');
        }
        
        try {
            const response = await this.circle.transfers.getTransfer(transferId);
            const transfer = response.data?.data || response.data;
            
            console.log(`📋 Transfer ${transferId} status:`, {
                status: transfer.status,
                transactionHash: transfer.transactionHash || 'still pending'
            });
            
            // Update local history with latest status
            const localTransfer = this.transferHistory.find(t => t.id === transferId);
            if (localTransfer) {
                localTransfer.status = transfer.status;
                if (transfer.transactionHash && transfer.transactionHash !== 'pending') {
                    localTransfer.transactionHash = transfer.transactionHash;
                    console.log(`✅ Got transaction hash for ${transferId}: ${transfer.transactionHash}`);
                }
                this.saveTransferHistory();
            }
            
            return transfer;
        } catch (error) {
            console.error(`Error getting transfer details: ${error.message}`);
            
            // Fallback to local history
            const localTransfer = this.transferHistory.find(t => t.id === transferId);
            if (localTransfer) {
                return localTransfer;
            }
            
            throw error;
        }
    }

    async getBalance(blockchain = 'ETH') {
        if (!this.initialized) await this.initialize();
        
        if (this.simulationMode) {
            return {
                amount: '1000.00',
                currency: 'USDC',
                blockchain: blockchain,
                walletAddress: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress
            };
        }
        
        try {
            const walletId = blockchain === 'SOL' ? this.solWalletId : this.ethWalletId;
            const response = await this.circle.wallets.getWallet(walletId);
            const wallet = response.data?.data || response.data;
            
            // Find USDC balance
            const usdcBalance = wallet.balances?.find(b => b.currency === 'USD') || { amount: '0.00' };
            
            return {
                amount: usdcBalance.amount,
                currency: 'USDC',
                blockchain: blockchain,
                walletAddress: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress
            };
        } catch (error) {
            console.error('Error getting balance:', error);
            return {
                amount: '0.00',
                currency: 'USDC',
                blockchain: blockchain,
                walletAddress: blockchain === 'SOL' ? this.solWalletAddress : this.ethWalletAddress
            };
        }
    }

    async getTransactionStatus(transferId) {
        try {
            const transfer = await this.getTransferDetails(transferId);
            return transfer.status || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    async getTransactionHash(transferId) {
        try {
            const transfer = await this.getTransferDetails(transferId);
            
            // Return actual transaction hash or 'pending' if not available yet
            return transfer.transactionHash || 'pending';
        } catch (error) {
            return 'pending';
        }
    }
}

export default CircleUSDCHandler;
