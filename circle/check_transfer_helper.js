// Helper script for checking transfer status
import CircleUSDCHandler from './circleHandler.js';

const transferId = process.argv[2];
if (!transferId) {
    console.error('Transfer ID required');
    process.exit(1);
}

const handler = new CircleUSDCHandler();
await handler.initialize();

try {
    const details = await handler.getTransferDetails(transferId);
    console.log(JSON.stringify({
        status: details.status || 'unknown',
        transactionHash: details.transactionHash || null,
        blockchain: details.destination?.chain || 'ETH',
        amount: details.amount?.amount || '0',
        errorCode: details.errorCode || null
    }));
} catch (error) {
    console.log(JSON.stringify({
        status: 'error',
        transactionHash: null,
        error: error.message
    }));
}
