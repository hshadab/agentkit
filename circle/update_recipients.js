// Add this at the top of workflowExecutor_generic.js after imports
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Update the getRecipientAddress function
function getRecipientAddress(recipient, blockchain = 'ETH') {
    const addresses = {
        'alice': blockchain === 'SOL' ? process.env.SOL_ALICE : process.env.ETH_ALICE,
        'bob': blockchain === 'SOL' ? process.env.SOL_BOB : process.env.ETH_BOB,
        'charlie': blockchain === 'SOL' ? process.env.SOL_CHARLIE : process.env.ETH_CHARLIE
    };
    
    // Fallback to Circle wallet addresses if test addresses not found
    const fallback = blockchain === 'SOL' ? 
        process.env.CIRCLE_SOL_WALLET_ADDRESS : 
        process.env.CIRCLE_ETH_WALLET_ADDRESS;
    
    return addresses[recipient.toLowerCase()] || fallback;
}
