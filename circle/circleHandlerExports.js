import CircleHandlerFixed from './circleHandler.js';

// Create a singleton instance
const circleHandler = new CircleHandlerFixed();

// Export individual functions that can be used directly
export async function transferUSDC(amount, recipientAddress, blockchain = 'ETH') {
    return await circleHandler.transfer(amount, recipientAddress, blockchain);
}

export async function checkTransferStatus(transferId) {
    return await circleHandler.getTransferStatus(transferId);
}

export async function getWalletInfo(walletId) {
    return await circleHandler.getWallet(walletId);
}

export async function initializeCircle() {
    return await circleHandler.initialize();
}

// Also export the class if needed
export { CircleHandlerFixed };

// Default export for backward compatibility
export default circleHandler;