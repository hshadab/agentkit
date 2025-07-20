#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const API_URL = 'https://api-sandbox.circle.com/v1';

// Wallet IDs from .env
const ETH_WALLET = process.env.CIRCLE_WALLET_ID || '1017342606';
const SOL_WALLET = process.env.CIRCLE_SOL_WALLET_ID || '1017342622';

async function addTestUSDC() {
    console.log('🔍 Circle Test USDC Tool');
    console.log('========================\n');
    
    // In Circle Sandbox, we need to simulate a card payment to add USDC
    // This creates a payment that credits USDC to a wallet
    
    console.log('📝 Creating test card payment to add USDC...\n');
    
    try {
        // For Ethereum wallet
        console.log('💳 Adding 50 USDC to Ethereum wallet...');
        const ethPayment = await createTestPayment(ETH_WALLET, '50.00', 'ETH');
        if (ethPayment) {
            console.log(`✅ Payment initiated: ${ethPayment.id}`);
        }
        
        // For Solana wallet
        console.log('\n💳 Adding 50 USDC to Solana wallet...');
        const solPayment = await createTestPayment(SOL_WALLET, '50.00', 'SOL');
        if (solPayment) {
            console.log(`✅ Payment initiated: ${solPayment.id}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        console.log('\n📌 Alternative: Manual Method');
        console.log('============================');
        console.log('1. Go to: https://app-sandbox.circle.com/');
        console.log('2. Sign in with your sandbox credentials');
        console.log('3. Navigate to "Wallets" section');
        console.log('4. Select your wallet');
        console.log('5. Click "Add Funds" or "Deposit"');
        console.log('6. Add test USDC (usually you can add up to $1000 test USDC)');
        console.log('\n💡 Or use the Circle API Mock Payments endpoint if enabled for your account');
    }
}

async function createTestPayment(walletId, amount, chain) {
    try {
        // First, let's try the payments endpoint
        const paymentData = {
            idempotencyKey: uuidv4(),
            amount: {
                amount: amount,
                currency: 'USD'
            },
            source: {
                type: 'card',
                id: 'test-card-id' // This would normally be a tokenized card
            },
            destination: {
                type: 'wallet',
                id: walletId
            },
            description: `Test USDC deposit for ${chain} wallet`
        };
        
        const response = await axios.post(
            `${API_URL}/payments`,
            paymentData,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.data;
        
    } catch (error) {
        // If regular payments don't work, try mock endpoints
        if (error.response?.status === 400 || error.response?.status === 404) {
            console.log(`ℹ️  Standard payment API not available, trying mock endpoints...`);
            return await createMockPayment(walletId, amount, chain);
        }
        throw error;
    }
}

async function createMockPayment(walletId, amount, chain) {
    try {
        // Circle sandbox mock payment endpoint
        const mockData = {
            idempotencyKey: uuidv4(),
            amount: {
                amount: amount,
                currency: 'USD'
            },
            destination: {
                type: 'wallet',
                id: walletId
            }
        };
        
        const response = await axios.post(
            `${API_URL}/mocks/payments/mint`,
            mockData,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.data;
        
    } catch (error) {
        console.log(`⚠️  Mock payment endpoint not available`);
        return null;
    }
}

// Check current balances first
async function checkBalance(walletId, name) {
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
        console.log(`\n💰 ${name} Wallet (${walletId}):`);
        
        if (wallet.balances && wallet.balances.length > 0) {
            wallet.balances.forEach(balance => {
                console.log(`   ${balance.currency}: ${balance.amount}`);
            });
        } else {
            console.log('   No balances');
        }
        
        return wallet;
    } catch (error) {
        console.error(`Error checking ${name} wallet:`, error.response?.data || error.message);
    }
}

// Run the tool
(async () => {
    console.log('Current Balances:');
    console.log('================');
    await checkBalance(ETH_WALLET, 'Ethereum');
    await checkBalance(SOL_WALLET, 'Solana');
    
    console.log('\n');
    await addTestUSDC();
    
    console.log('\n\nChecking Updated Balances:');
    console.log('=========================');
    setTimeout(async () => {
        await checkBalance(ETH_WALLET, 'Ethereum');
        await checkBalance(SOL_WALLET, 'Solana');
    }, 3000);
})();