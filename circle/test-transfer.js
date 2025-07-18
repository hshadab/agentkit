#!/usr/bin/env node
import { transferUSDC } from './circleHandler.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Test script for Circle USDC transfers
 * Usage: node circle/test-transfer.js
 */

async function testTransfer() {
    console.log('🧪 Testing USDC Transfer Capability\n');
    
    // Test configuration
    const testTransfer = {
        amount: 0.01,
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // alice ETH
        blockchain: 'ETH'
    };
    
    console.log('Transfer Details:');
    console.log(`- Amount: ${testTransfer.amount} USDC`);
    console.log(`- To: ${testTransfer.recipientAddress}`);
    console.log(`- Blockchain: ${testTransfer.blockchain}`);
    console.log(`- API Key: ${process.env.CIRCLE_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`- ETH Wallet ID: ${process.env.CIRCLE_ETH_WALLET_ID || 'Not set'}`);
    
    if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ETH_WALLET_ID) {
        console.error('\n❌ Missing configuration!');
        console.log('1. Set CIRCLE_API_KEY in .env');
        console.log('2. Run: node circle/create-wallets-api.js');
        console.log('3. Update .env with wallet IDs');
        return;
    }
    
    try {
        console.log('\n🚀 Attempting transfer...');
        const result = await transferUSDC(
            testTransfer.amount,
            testTransfer.recipientAddress,
            testTransfer.blockchain
        );
        
        console.log('✅ Transfer initiated successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
        
        if (result.transferId) {
            console.log(`\n📋 Check status: node circle/check-transfer-status.js ${result.transferId}`);
        }
        
    } catch (error) {
        console.error('\n❌ Transfer failed with error:');
        console.error('Error message:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTransfer();