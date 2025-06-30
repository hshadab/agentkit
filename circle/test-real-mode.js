import CircleUSDCHandler from './circleHandler.js';

const handler = new CircleUSDCHandler();
await handler.initialize();

console.log('🎯 Circle Status:');
console.log('   Simulation mode:', handler.simulationMode ? '❌ SIMULATED' : '✅ REAL TRANSFERS');

if (!handler.simulationMode) {
    const ethBal = await handler.getBalance('ETH');
    const solBal = await handler.getBalance('SOL');
    console.log('   ETH Balance:', ethBal.amount, 'USDC');
    console.log('   SOL Balance:', solBal.amount, 'USDC');
} else {
    console.log('\n❌ Still in simulation mode. Checking why...');
    console.log('   API Key present:', !!process.env.CIRCLE_API_KEY);
    console.log('   ETH Wallet ID:', process.env.CIRCLE_ETH_WALLET_ID);
    console.log('   SOL Wallet ID:', process.env.CIRCLE_SOL_WALLET_ID);
}

process.exit(0);
