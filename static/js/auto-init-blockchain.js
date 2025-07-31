// DISABLED: Auto-initialize blockchain connections
console.log('🔗 Auto-connection DISABLED - connections will happen on-demand when verifying');

// The auto-connection is now disabled to prevent constant refreshing
// Connections will be established when the user clicks a verify button

// Helper function to manually connect all
window.connectAllBlockchains = async function() {
    console.log('🔗 Connecting to all blockchains...');
    
    if (!window.blockchainVerifier) {
        console.error('❌ Blockchain verifier not ready');
        return;
    }
    
    const connections = [
        { name: 'Ethereum', method: 'connectEthereum' },
        { name: 'Base', method: 'connectBase' },
        { name: 'Avalanche', method: 'connectAvalanche' }
    ];
    
    for (const conn of connections) {
        try {
            console.log(`Connecting to ${conn.name}...`);
            await window.blockchainVerifier[conn.method]();
            console.log(`✅ ${conn.name} connected`);
        } catch (error) {
            console.error(`❌ ${conn.name} failed:`, error.message);
        }
    }
    
    console.log('✅ Connection attempts complete');
};

console.log('💡 Run connectAllBlockchains() in console to connect all chains');