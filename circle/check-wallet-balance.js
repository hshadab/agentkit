import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

async function checkWalletDetails(walletId, name) {
    console.log(`\n📊 ${name} Wallet (${walletId}):`);
    
    try {
        const response = await axios.get(
            `${API_URL}/wallets/${walletId}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const wallet = response.data.data;
        console.log(`Type: ${wallet.type}`);
        console.log(`Description: ${wallet.description || 'No description'}`);
        
        if (wallet.balances && wallet.balances.length > 0) {
            console.log('Balances:');
            for (const balance of wallet.balances) {
                console.log(`  - ${balance.amount} ${balance.currency}`);
            }
        } else {
            console.log('Balance: 0 (empty wallet)');
        }
        
        // Check for addresses
        if (wallet.addresses && wallet.addresses.length > 0) {
            console.log('Addresses:');
            for (const addr of wallet.addresses) {
                console.log(`  - ${addr.chain}: ${addr.address}`);
            }
        }
        
        return wallet;
    } catch (error) {
        console.error(`❌ Error checking wallet:`, error.response?.data || error.message);
        return null;
    }
}

async function checkTransferStatus(transferId) {
    console.log(`\n🔍 Checking transfer ${transferId}...`);
    
    try {
        const response = await axios.get(
            `${API_URL}/transfers/${transferId}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const transfer = response.data.data;
        console.log(`Status: ${transfer.status}`);
        console.log(`Amount: ${transfer.amount.amount} ${transfer.amount.currency}`);
        console.log(`From: ${transfer.source.address || transfer.source.id}`);
        console.log(`To: ${transfer.destination.address}`);
        
        if (transfer.transactionHash) {
            console.log(`Transaction Hash: ${transfer.transactionHash}`);
            if (transfer.destination.chain === 'ETH') {
                console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${transfer.transactionHash}`);
            }
        }
        
        if (transfer.errorCode) {
            console.log(`❌ Error: ${transfer.errorCode} - ${transfer.errorMessage || 'Unknown error'}`);
        }
        
        return transfer;
    } catch (error) {
        console.error(`❌ Error checking transfer:`, error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log('🔍 Circle Wallet Balance Check\n');
    
    const ethWalletId = process.env.CIRCLE_ETH_WALLET_ID;
    const solWalletId = process.env.CIRCLE_SOL_WALLET_ID;
    
    // Check wallet balances
    await checkWalletDetails(ethWalletId, 'Ethereum');
    await checkWalletDetails(solWalletId, 'Solana');
    
    // Check recent transfer
    const recentTransferId = 'a7d93128-665c-4b55-baa8-36c13e95cca3';
    await checkTransferStatus(recentTransferId);
    
    console.log('\n💡 Note: New wallets start with 0 balance.');
    console.log('To fund them:');
    console.log('1. Transfer USDC from your merchant wallet (1017339334) which has $16.79 USD');
    console.log('2. Or use Circle sandbox dashboard to add test USDC');
}

main().catch(console.error);