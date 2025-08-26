#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

// Wallet IDs from .env
const ETH_WALLET = process.env.CIRCLE_WALLET_ID || '1017342606';
const SOL_WALLET = process.env.CIRCLE_SOL_WALLET_ID || '1017342622';

async function getWalletAddress(walletId, name) {
    try {
        const response = await axios.get(
            `${API_URL}/wallets/${walletId}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );
        
        const wallet = response.data.data;
        
        // Get blockchain addresses
        if (wallet.addresses) {
            console.log(`\n📍 ${name} Wallet Addresses:`);
            console.log(`   Wallet ID: ${walletId}`);
            
            wallet.addresses.forEach(addr => {
                console.log(`   ${addr.chain} Address: ${addr.address}`);
                console.log(`   Currency: ${addr.currency}`);
            });
            
            return wallet.addresses;
        }
        
    } catch (error) {
        console.error(`Error getting ${name} wallet:`, error.response?.data || error.message);
    }
}

// Run the script
(async () => {
    console.log('🔍 Circle Wallet Addresses');
    console.log('==========================');
    
    const ethAddresses = await getWalletAddress(ETH_WALLET, 'Ethereum');
    const solAddresses = await getWalletAddress(SOL_WALLET, 'Solana');
    
    console.log('\n📋 Summary:');
    console.log('===========');
    
    if (ethAddresses && ethAddresses.length > 0) {
        const ethAddr = ethAddresses.find(a => a.chain === 'ETH');
        if (ethAddr) {
            console.log(`\nEthereum (Sepolia) USDC Address:`);
            console.log(`${ethAddr.address}`);
        }
    }
    
    if (solAddresses && solAddresses.length > 0) {
        const solAddr = solAddresses.find(a => a.chain === 'SOL');
        if (solAddr) {
            console.log(`\nSolana (Devnet) USDC Address:`);
            console.log(`${solAddr.address}`);
        }
    }
    
    console.log('\n💡 Use these addresses to:');
    console.log('1. Send USDC from external wallets');
    console.log('2. Request test USDC from faucets');
    console.log('3. Add funds via Circle dashboard');
})();