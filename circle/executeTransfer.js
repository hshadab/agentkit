#!/usr/bin/env node
import CircleUSDCHandler from './circleHandler.js';

const TEST_ADDRESSES = {
    "alice": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "alice_solana": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
    "bob": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "bob_solana": "GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW",
    "charlie": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "charlie_solana": "2sWRYvL8M4S9XPvKNfUdy2Qvn6LYaXjqXDvMv9KsxbUa"
};

async function main() {
    // Detect if this is a KYC transfer based on command
    const command = process.argv.slice(2).join(' ');
    const isKYCTransfer = command.includes('KYC') || command.includes('kyc') || command.includes('verified');

    try {
        const command = process.argv.slice(2).join(' ');
        console.error(`🎯 Processing: ${command}`);
        
        const lowerCommand = command.toLowerCase();
        
        // Parse amount
        const amountMatch = command.match(/(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.1;
        
        // Parse recipient
        let recipientMatch = command.match(/to ([a-zA-Z]+|0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/);
        let recipient = recipientMatch ? recipientMatch[1] : 'alice';
        
        // Determine blockchain
        let blockchain = 'ETH';
        let recipientAddress = recipient;
        
        const isSolanaRequested = lowerCommand.includes('solana') || lowerCommand.includes(' sol');
        
        // Resolve test addresses
        const recipientLower = recipient.toLowerCase();
        if (TEST_ADDRESSES[recipientLower]) {
            if (isSolanaRequested && TEST_ADDRESSES[`${recipientLower}_solana`]) {
                recipientAddress = TEST_ADDRESSES[`${recipientLower}_solana`];
                blockchain = 'SOL';
            } else {
                recipientAddress = TEST_ADDRESSES[recipientLower];
            }
        } else {
            // Check address format
            if (recipient.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
                blockchain = 'SOL';
            }
            if (isSolanaRequested) {
                blockchain = 'SOL';
            }
        }
        
        // Initialize handler and execute transfer
        const handler = new CircleUSDCHandler();
        await handler.initialize();
        
        const result = await handler.transferUSDC(amount, recipientAddress, isKYCTransfer, blockchain);
        
        // Output clean JSON response
        const response = {
            success: true,
            transactionId: result.transactionHash || result.id || 'pending',
            transactionHash: result.transactionHash || result.id || 'pending',
            transferId: result.transferId || result.id,
            circleTransferId: result.circleTransferId || result.id,
            message: `Transferred ${amount} USDC to ${recipientAddress} on ${blockchain}`,
            amount: amount.toString(),
            recipient: recipientAddress,
            from: result.from,
            blockchain: blockchain
        };
        
        if (result.simulated) {
            response.simulated = true;
        }
        
        console.log(JSON.stringify(response));
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    }
}

main();
