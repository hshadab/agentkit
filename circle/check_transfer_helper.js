// check_transfer_helper.js
import CircleUSDCHandler from './circleHandler.js';

async function checkTransferStatus(transferId) {
    try {
        const handler = new CircleUSDCHandler();
        await handler.initialize();
        
        // This will automatically check Circle API first, 
        // then fall back to transfer_history.json
        const transferDetails = await handler.getTransferDetails(transferId);
        
        // Return the details in a format the Python service expects
        console.log(JSON.stringify({
            success: true,
            status: transferDetails.status || 'unknown',
            transactionHash: transferDetails.transactionHash || 'pending',
            transferId: transferDetails.id || transferId,
            blockchain: transferDetails.blockchain || 'ETH',
            amount: transferDetails.amount,
            recipient: transferDetails.recipient,
            from: transferDetails.from
        }));
        
    } catch (error) {
        // Check if it's a rate limit error
        if (error.message && error.message.includes('429')) {
            console.log(JSON.stringify({
                success: false,
                status: 'rate_limited',
                error: 'Rate limit exceeded'
            }));
        } else {
            console.log(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }
}

// Get transfer ID from command line argument
const transferId = process.argv[2];
if (!transferId) {
    console.log(JSON.stringify({
        success: false,
        error: 'No transfer ID provided'
    }));
    process.exit(1);
}

checkTransferStatus(transferId);
