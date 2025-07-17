// recipientResolver.js - Maps common recipient names to blockchain addresses

const RECIPIENT_ADDRESSES = {
    // Common test addresses for demos
    alice: {
        ETH: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',  // Hardhat test address #1
        SOL: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi'  // Devnet test address
    },
    bob: {
        ETH: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',  // Hardhat test address #2
        SOL: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi'  // Same as alice for now
    },
    charlie: {
        ETH: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',  // Hardhat test address #3
        SOL: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi'  // Same as alice for now
    },
    dave: {
        ETH: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',  // Hardhat test address #4
        SOL: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi'  // Same as alice for now
    },
    // Circle's own test addresses from documentation
    'circle-test': {
        ETH: '0x493A9869E3B5f846f72267ab19B76e9bf99d51b1',  // Circle's test ETH address
        SOL: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi'  // Circle's test SOL address
    }
};

/**
 * Resolves a recipient identifier to a blockchain address
 * @param {string} recipient - The recipient identifier (name or address)
 * @param {string} blockchain - The blockchain (ETH or SOL)
 * @returns {string} The resolved blockchain address
 */
export function resolveRecipient(recipient, blockchain = 'ETH') {
    // If it's already a valid address format, return it
    if (blockchain === 'ETH' && recipient.startsWith('0x') && recipient.length === 42) {
        return recipient;
    }
    
    if (blockchain === 'SOL' && recipient.length > 30 && !recipient.includes(' ')) {
        return recipient;
    }
    
    // Try to resolve from known recipients
    const recipientLower = recipient.toLowerCase();
    if (RECIPIENT_ADDRESSES[recipientLower]) {
        const address = RECIPIENT_ADDRESSES[recipientLower][blockchain];
        if (address) {
            console.log(`📍 Resolved "${recipient}" to ${blockchain} address: ${address}`);
            return address;
        }
    }
    
    // If not found, log a warning and return the original
    console.warn(`⚠️  Could not resolve recipient "${recipient}" for ${blockchain}. Using as-is.`);
    console.warn(`💡 Tip: Use a valid ${blockchain} address or one of: ${Object.keys(RECIPIENT_ADDRESSES).join(', ')}`);
    return recipient;
}

// Export the addresses for reference
export { RECIPIENT_ADDRESSES };

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Testing recipient resolver:\n');
    
    const tests = [
        { recipient: 'alice', blockchain: 'ETH' },
        { recipient: 'alice', blockchain: 'SOL' },
        { recipient: 'bob', blockchain: 'ETH' },
        { recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD9c', blockchain: 'ETH' },
        { recipient: 'unknown-user', blockchain: 'ETH' }
    ];
    
    tests.forEach(test => {
        const resolved = resolveRecipient(test.recipient, test.blockchain);
        console.log(`${test.recipient} (${test.blockchain}) → ${resolved}`);
    });
}