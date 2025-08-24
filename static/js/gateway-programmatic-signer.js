// Gateway Programmatic Signer - Handles signing without MetaMask confirmations
// Uses private key from environment for automated signing

class GatewayProgrammaticSigner {
    constructor() {
        // The private key will be injected here from backend
        // In production, this should be handled more securely
        this.privateKey = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Try to get private key from backend
            // For demo purposes, we'll inject it directly (in production use secure methods)
            const response = await fetch('/api/gateway/signing-config', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.privateKey) {
                    this.privateKey = data.privateKey;
                    console.log('🔑 Programmatic signing enabled - no MetaMask confirmations needed!');
                    this.initialized = true;
                    return true;
                }
            }
        } catch (error) {
            console.log('⚠️ Programmatic signing not available, will use MetaMask');
        }
        
        return false;
    }

    async signTypedData(typedData) {
        if (!this.privateKey) {
            throw new Error('Private key not available for programmatic signing');
        }

        try {
            // Create wallet from private key
            const wallet = new ethers.Wallet(this.privateKey);
            
            // Sign the typed data
            const signature = await wallet._signTypedData(
                typedData.domain,
                { BurnIntent: typedData.types.BurnIntent },
                typedData.message
            );
            
            console.log('✅ Signed programmatically without MetaMask');
            return signature;
        } catch (error) {
            console.error('❌ Programmatic signing failed:', error);
            throw error;
        }
    }

    isAvailable() {
        return this.privateKey && this.privateKey !== 'undefined';
    }
}

// Export for use in Gateway workflow manager
window.GatewayProgrammaticSigner = GatewayProgrammaticSigner;