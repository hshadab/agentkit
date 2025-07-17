import CircleUSDCHandler from './circleHandler.js';

console.log('🧪 Complete Circle Test\n');

const handler = new CircleUSDCHandler();
await handler.initialize();

console.log('1️⃣ Connection Status:');
console.log('   Mode:', handler.simulationMode ? '❌ SIMULATED' : '✅ REAL');

if (!handler.simulationMode) {
    console.log('\n2️⃣ Wallet Balances:');
    const ethBal = await handler.getBalance('ETH');
    const solBal = await handler.getBalance('SOL');
    console.log('   ETH:', ethBal.amount, 'USDC');
    console.log('   SOL:', solBal.amount, 'USDC');
    
    console.log('\n3️⃣ Test Transfer (0.01 USDC):');
    try {
        const result = await handler.transferUSDC(0.01, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', true, 'ETH');
        console.log('   ✅ Transfer initiated!');
        console.log('   Transfer ID:', result.transferId);
        console.log('   Status:', result.status);
    } catch (e) {
        console.log('   ❌ Transfer failed:', e.message);
    }
}

process.exit(0);
