// PERMANENT MetaMask block - survives other scripts
console.log('🚫 PERMANENT METAMASK BLOCK INSTALLING...');

(function() {
    'use strict';
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const EXPECTED_ADDRESS = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
    
    // Create our fake ethereum
    const fakeEthereum = {
        isMetaMask: true,
        selectedAddress: EXPECTED_ADDRESS,
        _metamask: { isUnlocked: () => true },
        
        request: async function(args) {
            console.log('🚫 INTERCEPTED:', args.method);
            
            switch(args.method) {
                case 'eth_requestAccounts':
                case 'eth_accounts':
                    return [EXPECTED_ADDRESS];
                    
                case 'eth_chainId':
                    return '0xaa36a7';
                    
                case 'eth_signTypedData_v4':
                    console.log('🚫 SIGNING WITHOUT METAMASK');
                    // Wait for ethers if needed
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
                    console.log('🚫 Signed:', signature.substring(0, 30) + '...');
                    return signature;
                    
                case 'wallet_switchEthereumChain':
                    return null;
                    
                default:
                    console.log('🚫 Pass through:', args.method);
                    // Return dummy data for other methods
                    return null;
            }
        },
        
        on: function() { return this; },
        removeListener: function() { return this; },
        enable: async function() { return [EXPECTED_ADDRESS]; },
        send: async function() { return null; },
        sendAsync: function() { return null; }
    };
    
    // AGGRESSIVE: Override window.ethereum with a non-configurable property
    Object.defineProperty(window, 'ethereum', {
        get: function() {
            return fakeEthereum;
        },
        set: function(val) {
            console.log('🚫 BLOCKED attempt to replace ethereum object');
            // Silently ignore attempts to set ethereum
        },
        configurable: false,
        enumerable: true
    });
    
    // ALSO override Web3 provider detection
    let web3Interval = setInterval(() => {
        if (window.Web3) {
            console.log('🚫 Web3 detected, patching...');
            
            // Override Web3 provider detection
            const OriginalWeb3 = window.Web3;
            window.Web3 = function(...args) {
                console.log('🚫 Web3 constructor intercepted');
                // If they try to use window.ethereum, give them our fake
                if (args[0] === window.ethereum || args[0] === fakeEthereum) {
                    args[0] = fakeEthereum;
                }
                return new OriginalWeb3(...args);
            };
            
            // Copy static methods
            Object.setPrototypeOf(window.Web3, OriginalWeb3);
            Object.keys(OriginalWeb3).forEach(key => {
                window.Web3[key] = OriginalWeb3[key];
            });
            
            clearInterval(web3Interval);
        }
    }, 10);
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(web3Interval), 5000);
    
    console.log('🚫 PERMANENT BLOCK INSTALLED - MetaMask will NEVER popup');
    
})();