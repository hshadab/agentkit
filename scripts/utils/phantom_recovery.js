// Phantom Recovery Script
// This attempts to recover Phantom's connection

async function diagnosePhantom() {
    console.log('=== Phantom Diagnosis ===');
    
    // Check if Phantom exists
    if (!window.phantom) {
        console.log('❌ Phantom not found');
        return false;
    }
    
    console.log('✅ Phantom object exists');
    
    // Check Ethereum provider
    if (!window.phantom.ethereum) {
        console.log('❌ Phantom Ethereum provider not found');
        return false;
    }
    
    console.log('✅ Phantom Ethereum provider exists');
    
    // Test basic provider properties
    console.log('Provider properties:', {
        isPhantom: window.phantom.ethereum.isPhantom,
        isConnected: window.phantom.ethereum.isConnected?.() || 'method not available',
        chainId: window.phantom.ethereum.chainId,
        selectedAddress: window.phantom.ethereum.selectedAddress
    });
    
    // Try a simple RPC call
    try {
        const version = await window.phantom.ethereum.request({ 
            method: 'web3_clientVersion' 
        });
        console.log('✅ RPC call successful, version:', version);
        return true;
    } catch (error) {
        console.log('❌ RPC call failed:', error.message);
        
        // Check if it's the service worker error
        if (error.message?.includes('service worker') || 
            error.message?.includes('disconnected port')) {
            console.log('\n🔧 PHANTOM SERVICE WORKER DISCONNECTED');
            console.log('This requires manual intervention:');
            console.log('1. Open new tab');
            console.log('2. Go to: about:addons (Firefox) or chrome://extensions (Chrome)');
            console.log('3. Find Phantom, disable it, wait 2 seconds, re-enable it');
            console.log('4. Return to this tab and refresh');
            
            return false;
        }
    }
    
    return false;
}

// Alternative: Try to force a reconnection
async function attemptPhantomReconnect() {
    console.log('\n=== Attempting Phantom Reconnect ===');
    
    try {
        // Method 1: Try to re-request accounts
        const accounts = await window.phantom.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        console.log('✅ Got accounts:', accounts);
        
        // Method 2: Try to switch network to force reconnection
        try {
            await window.phantom.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // Sepolia
            });
            console.log('✅ Switched to Sepolia');
        } catch (switchError) {
            console.log('⚠️ Network switch failed:', switchError.message);
        }
        
        return true;
    } catch (error) {
        console.log('❌ Reconnection failed:', error.message);
        return false;
    }
}

// Export for use in console
window.diagnosePhantom = diagnosePhantom;
window.attemptPhantomReconnect = attemptPhantomReconnect;

// Auto-run diagnosis
diagnosePhantom().then(isWorking => {
    if (!isWorking) {
        console.log('\n🔄 Attempting automatic recovery...');
        attemptPhantomReconnect();
    }
});