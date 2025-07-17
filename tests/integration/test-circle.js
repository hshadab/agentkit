import CircleUSDCHandler from './circleHandler.js';
import dotenv from 'dotenv';
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';

// Load environment variables
dotenv.config({ path: '../.env' });

console.log('🔍 Testing Circle Configuration...\n');

// 1. Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('   CIRCLE_API_KEY:', process.env.CIRCLE_API_KEY ? '✅ Present' : '❌ Missing');
console.log('   Key starts with SAND_API_KEY:', process.env.CIRCLE_API_KEY?.startsWith('SAND_API_KEY:') ? '✅ Yes' : '❌ No');
console.log('   ETH Wallet ID:', process.env.CIRCLE_ETH_WALLET_ID || 'Missing');
console.log('   SOL Wallet ID:', process.env.CIRCLE_SOL_WALLET_ID || 'Missing');
console.log('   Environment:', process.env.CIRCLE_ENVIRONMENT || 'Missing');

// 2. Test Circle SDK directly
console.log('\n2️⃣ Testing Circle SDK Connection:');
try {
    const circle = new Circle(
        process.env.CIRCLE_API_KEY,
        CircleEnvironments.sandbox
    );
    
    console.log('   SDK created successfully');
    
    // Try to get configuration (simplest API call)
    const config = await circle.management.getAccountConfiguration();
    console.log('   ✅ API Connection successful!');
    console.log('   Account ID:', config.data?.payments?.masterWalletId || 'N/A');
    
    // Try to list wallets
    const wallets = await circle.wallets.getAll();
    console.log('   ✅ Wallets accessible:', wallets.data?.length || 0, 'wallets found');
    
} catch (error) {
    console.log('   ❌ API Connection failed!');
    console.log('   Error:', error.message);
    if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
}

// 3. Test CircleUSDCHandler
console.log('\n3️⃣ Testing CircleUSDCHandler:');
const handler = new CircleUSDCHandler();
await handler.initialize();
console.log('   Simulation mode:', handler.simulationMode ? '❌ YES (simulated)' : '✅ NO (real)');

if (!handler.simulationMode) {
    // Get balances
    console.log('\n4️⃣ Wallet Balances:');
    const ethBalance = await handler.getBalance('ETH');
    const solBalance = await handler.getBalance('SOL');
    console.log('   ETH Wallet:', ethBalance.amount, 'USDC');
    console.log('   SOL Wallet:', solBalance.amount, 'USDC');
}

process.exit(0);
