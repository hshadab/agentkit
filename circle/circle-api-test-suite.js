#!/usr/bin/env node

/**
 * Circle API Test Suite
 * 
 * This script provides comprehensive testing of Circle API functionality:
 * - API connection validation
 * - Wallet balance checking (USD and USDC)
 * - Transfer status monitoring
 * - Blockchain address verification
 * - Recent transaction history
 * 
 * Usage: node circle-api-test-suite.js [command]
 * Commands:
 *   balance - Check all wallet balances
 *   transfer <id> - Check specific transfer status
 *   history - Show recent transfer history
 *   full - Run full test suite (default)
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Circle API Configuration
const CONFIG = {
    API_KEY: process.env.CIRCLE_API_KEY,
    API_URL: 'https://api-sandbox.circle.com/v1',
    ETH_WALLET_ID: process.env.CIRCLE_ETH_WALLET_ID,
    SOL_WALLET_ID: process.env.CIRCLE_SOL_WALLET_ID,
    MERCHANT_WALLET_ID: '1017339334' // From .env comments
};

// Axios instance with default headers
const api = axios.create({
    baseURL: CONFIG.API_URL,
    headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// API response interceptor for error handling
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            console.error(`API Error (${error.response.status}):`, error.response.data?.message || error.message);
        } else {
            console.error('Network Error:', error.message);
        }
        throw error;
    }
);

/**
 * Test API connection and get merchant info
 */
async function testConnection() {
    console.log('🔌 Testing Circle API Connection...\n');
    
    try {
        const response = await api.get('/configuration');
        const config = response.data.data;
        
        console.log('✅ API Connection Successful');
        console.log(`Merchant ID: ${config.merchantId}`);
        console.log(`Environment: ${CONFIG.API_KEY.includes('SAND_API_KEY') ? 'Sandbox' : 'Production'}`);
        
        // Get supported currencies
        const paymentsConfig = config.payments;
        if (paymentsConfig?.masterWallet) {
            console.log(`Master Wallet: ${paymentsConfig.masterWallet}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ API Connection Failed');
        return false;
    }
}

/**
 * Get detailed wallet information including balances
 */
async function getWalletInfo(walletId, name) {
    console.log(`\n💰 ${name} Wallet (${walletId})`);
    console.log('─'.repeat(50));
    
    try {
        const response = await api.get(`/wallets/${walletId}`);
        const wallet = response.data.data;
        
        // Basic info
        console.log(`Type: ${wallet.type}`);
        console.log(`Entity: ${wallet.entityId}`);
        console.log(`Created: ${new Date(wallet.createDate).toLocaleDateString()}`);
        
        // Balances
        if (wallet.balances && wallet.balances.length > 0) {
            console.log('\nBalances:');
            
            let totalUSD = 0;
            wallet.balances.forEach(balance => {
                const amount = parseFloat(balance.amount);
                console.log(`  • ${amount.toFixed(2)} ${balance.currency}`);
                
                if (balance.currency === 'USD' || balance.currency === 'USDC') {
                    totalUSD += amount;
                }
            });
            
            if (totalUSD > 0) {
                console.log(`  Total USD Value: $${totalUSD.toFixed(2)}`);
            }
        } else {
            console.log('\n⚠️  No balance (empty wallet)');
        }
        
        // Blockchain addresses
        if (wallet.addresses && wallet.addresses.length > 0) {
            console.log('\nBlockchain Addresses:');
            wallet.addresses.forEach(addr => {
                console.log(`  ${addr.chain}:`);
                console.log(`    Address: ${addr.address}`);
                console.log(`    Explorer: ${getExplorerLink(addr.chain, addr.address)}`);
            });
        }
        
        return wallet;
    } catch (error) {
        if (error.response?.status === 404) {
            console.error(`❌ Wallet not found. Check wallet ID in .env`);
        }
        return null;
    }
}

/**
 * Get blockchain explorer link
 */
function getExplorerLink(chain, address) {
    switch(chain) {
        case 'ETH':
            return `https://sepolia.etherscan.io/address/${address}`;
        case 'SOL':
            return `https://explorer.solana.com/address/${address}?cluster=devnet`;
        case 'BASE':
            return `https://sepolia.basescan.org/address/${address}`;
        default:
            return 'N/A';
    }
}

/**
 * Check transfer status by ID
 */
async function checkTransfer(transferId) {
    console.log(`\n🔍 Checking Transfer ${transferId}`);
    console.log('─'.repeat(50));
    
    try {
        const response = await api.get(`/transfers/${transferId}`);
        const transfer = response.data.data;
        
        // Basic info
        console.log(`Status: ${getStatusEmoji(transfer.status)} ${transfer.status}`);
        console.log(`Amount: ${transfer.amount.amount} ${transfer.amount.currency}`);
        console.log(`Created: ${new Date(transfer.createDate).toLocaleString()}`);
        
        // Source
        console.log('\nSource:');
        if (transfer.source.type === 'wallet') {
            console.log(`  Wallet ID: ${transfer.source.id}`);
        } else {
            console.log(`  Address: ${transfer.source.address}`);
        }
        
        // Destination
        console.log('\nDestination:');
        if (transfer.destination.type === 'blockchain') {
            console.log(`  Chain: ${transfer.destination.chain}`);
            console.log(`  Address: ${transfer.destination.address}`);
        } else {
            console.log(`  Wallet ID: ${transfer.destination.id}`);
        }
        
        // Transaction details
        if (transfer.transactionHash) {
            console.log('\nBlockchain Transaction:');
            console.log(`  Hash: ${transfer.transactionHash}`);
            console.log(`  Explorer: ${getTransactionExplorer(transfer.destination.chain, transfer.transactionHash)}`);
        }
        
        // Error details
        if (transfer.errorCode) {
            console.log('\n❌ Error Details:');
            console.log(`  Code: ${transfer.errorCode}`);
            console.log(`  Message: ${transfer.errorMessage}`);
        }
        
        return transfer;
    } catch (error) {
        return null;
    }
}

/**
 * Get transaction explorer link
 */
function getTransactionExplorer(chain, txHash) {
    switch(chain) {
        case 'ETH':
            return `https://sepolia.etherscan.io/tx/${txHash}`;
        case 'SOL':
            return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
        case 'BASE':
            return `https://sepolia.basescan.org/tx/${txHash}`;
        default:
            return 'N/A';
    }
}

/**
 * Get status emoji
 */
function getStatusEmoji(status) {
    switch(status) {
        case 'complete': return '✅';
        case 'pending': return '⏳';
        case 'failed': return '❌';
        default: return '❓';
    }
}

/**
 * Get recent transfers
 */
async function getRecentTransfers(limit = 10) {
    console.log(`\n📜 Recent Transfers (Last ${limit})`);
    console.log('─'.repeat(50));
    
    try {
        const response = await api.get(`/transfers?pageSize=${limit}`);
        const transfers = response.data.data;
        
        if (transfers.length === 0) {
            console.log('No transfers found');
            return;
        }
        
        transfers.forEach((transfer, index) => {
            console.log(`\n${index + 1}. Transfer ${transfer.id.substring(0, 8)}...`);
            console.log(`   Status: ${getStatusEmoji(transfer.status)} ${transfer.status}`);
            console.log(`   Amount: ${transfer.amount.amount} ${transfer.amount.currency}`);
            console.log(`   Date: ${new Date(transfer.createDate).toLocaleString()}`);
            
            if (transfer.destination.type === 'blockchain') {
                console.log(`   To: ${transfer.destination.address.substring(0, 10)}... (${transfer.destination.chain})`);
            }
            
            if (transfer.transactionHash) {
                console.log(`   TX: ${transfer.transactionHash.substring(0, 10)}...`);
            }
        });
        
        return transfers;
    } catch (error) {
        return [];
    }
}

/**
 * Check all configured wallets
 */
async function checkAllWallets() {
    console.log('\n🏦 Wallet Balance Summary');
    console.log('═'.repeat(50));
    
    const wallets = [
        { id: CONFIG.ETH_WALLET_ID, name: 'Ethereum' },
        { id: CONFIG.SOL_WALLET_ID, name: 'Solana' },
        { id: CONFIG.MERCHANT_WALLET_ID, name: 'Merchant' }
    ];
    
    let totalUSD = 0;
    let totalUSDC = 0;
    
    for (const wallet of wallets) {
        if (wallet.id) {
            const info = await getWalletInfo(wallet.id, wallet.name);
            
            if (info && info.balances) {
                info.balances.forEach(balance => {
                    const amount = parseFloat(balance.amount);
                    if (balance.currency === 'USD') {
                        totalUSD += amount;
                    } else if (balance.currency === 'USDC') {
                        totalUSDC += amount;
                    }
                });
            }
        }
    }
    
    console.log('\n💵 Total Balances Across All Wallets:');
    console.log('─'.repeat(50));
    console.log(`USD:  $${totalUSD.toFixed(2)}`);
    console.log(`USDC: ${totalUSDC.toFixed(2)} USDC`);
    console.log(`Total Value: $${(totalUSD + totalUSDC).toFixed(2)}`);
}

/**
 * Display usage instructions
 */
function showUsage() {
    console.log('\n📚 Circle API Test Suite - Usage Guide');
    console.log('═'.repeat(50));
    console.log('\nAvailable Commands:');
    console.log('  node circle-api-test-suite.js           - Run full test suite');
    console.log('  node circle-api-test-suite.js balance   - Check all wallet balances');
    console.log('  node circle-api-test-suite.js transfer <id> - Check specific transfer');
    console.log('  node circle-api-test-suite.js history   - Show recent transfers');
    console.log('  node circle-api-test-suite.js help      - Show this help');
    
    console.log('\n🔧 Configuration:');
    console.log('  Ensure these environment variables are set in .env:');
    console.log('  - CIRCLE_API_KEY');
    console.log('  - CIRCLE_ETH_WALLET_ID');
    console.log('  - CIRCLE_SOL_WALLET_ID');
    
    console.log('\n💡 Tips:');
    console.log('  • Use Circle sandbox dashboard to fund test wallets');
    console.log('  • Merchant wallets hold USD, blockchain wallets hold USDC');
    console.log('  • Check transfer IDs from the history command');
}

/**
 * Main execution
 */
async function main() {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    // Check API key
    if (!CONFIG.API_KEY) {
        console.error('❌ CIRCLE_API_KEY not found in environment variables');
        console.error('Please configure your .env file');
        process.exit(1);
    }
    
    console.log('🔵 Circle API Test Suite');
    console.log('═'.repeat(50));
    
    // Handle commands
    switch(command) {
        case 'balance':
            if (await testConnection()) {
                await checkAllWallets();
            }
            break;
            
        case 'transfer':
            if (!arg) {
                console.error('❌ Please provide a transfer ID');
                console.error('Usage: node circle-api-test-suite.js transfer <id>');
            } else if (await testConnection()) {
                await checkTransfer(arg);
            }
            break;
            
        case 'history':
            if (await testConnection()) {
                await getRecentTransfers();
            }
            break;
            
        case 'help':
            showUsage();
            break;
            
        default:
            // Run full test suite
            if (await testConnection()) {
                await checkAllWallets();
                await getRecentTransfers(5);
                showUsage();
            }
    }
}

// Run the test suite
main().catch(error => {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
});