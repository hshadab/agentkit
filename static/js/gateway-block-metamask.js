// BLOCK MetaMask completely for Gateway
console.log('🛑 BLOCKING METAMASK FOR GATEWAY...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const EXPECTED_ADDRESS = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
    
    // Save original ethereum
    const realEthereum = window.ethereum;
    
    // Create fake ethereum that never opens MetaMask
    const fakeEthereum = {
        isMetaMask: true,
        selectedAddress: EXPECTED_ADDRESS,
        
        request: async function(args) {
            console.log('🛑 BLOCKED:', args.method);
            
            // Handle different request types
            switch(args.method) {
                case 'eth_requestAccounts':
                case 'eth_accounts':
                    console.log('🛑 Returning fake account');
                    return [EXPECTED_ADDRESS];
                    
                case 'eth_chainId':
                    return '0xaa36a7'; // Sepolia
                    
                case 'eth_signTypedData_v4':
                    console.log('🛑 SIGNING PROGRAMMATICALLY - NO METAMASK!');
                    
                    // Wait for ethers
                    while (!window.ethers) {
                        await new Promise(r => setTimeout(r, 50));
                    }
                    
                    const [account, typedDataJson] = args.params;
                    const typedData = JSON.parse(typedDataJson);
                    
                    const wallet = new ethers.Wallet(PRIVATE_KEY);
                    const signature = await wallet._signTypedData(
                        typedData.domain,
                        typedData.types,
                        typedData.message
                    );
                    
                    console.log('🛑 Signed without MetaMask:', signature.substring(0, 30) + '...');
                    return signature;
                    
                case 'wallet_switchEthereumChain':
                    console.log('🛑 Fake chain switch');
                    return null;
                    
                default:
                    console.log('🛑 Passing through:', args.method);
                    if (realEthereum) {
                        return realEthereum.request(args);
                    }
                    throw new Error('Method not supported: ' + args.method);
            }
        },
        
        on: function() { return this; },
        removeListener: function() { return this; },
        
        // Fake enable
        enable: async function() {
            return [EXPECTED_ADDRESS];
        }
    };
    
    // Replace window.ethereum
    Object.defineProperty(window, 'ethereum', {
        get: function() {
            return fakeEthereum;
        },
        set: function(val) {
            console.log('🛑 Attempt to set ethereum blocked');
        },
        configurable: false
    });
    
    console.log('🛑 METAMASK COMPLETELY BLOCKED');
    
})();