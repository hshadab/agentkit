// Emergency CCTP Patch - Overrides any cached versions
console.log('🚑 Loading CCTP emergency patch...');

// Override the problematic function directly
window.cctpEmergencyPatch = function(originalFunction) {
    return function(...args) {
        console.log('🚑 Emergency CCTP patch activated');
        console.log('   Arguments:', args);
        
        // Check all arguments for PENDING
        const hasAnyPending = args.some(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg).includes('PENDING');
            }
            return String(arg).includes('PENDING');
        });
        
        if (hasAnyPending) {
            console.error('🚨 PENDING values detected in arguments - blocking call');
            throw new Error('Emergency patch: PENDING values detected, blocking contract call');
        }
        
        console.log('✅ No PENDING values detected, proceeding...');
        return originalFunction.apply(this, args);
    };
};

// Patch ethers.js contract calls if they exist
if (window.ethers && window.ethers.Contract) {
    const originalContract = window.ethers.Contract;
    window.ethers.Contract = function(...args) {
        const contract = new originalContract(...args);
        
        // Wrap all contract methods
        Object.getOwnPropertyNames(contract).forEach(prop => {
            if (typeof contract[prop] === 'function') {
                contract[prop] = window.cctpEmergencyPatch(contract[prop]);
            }
        });
        
        return contract;
    };
    
    console.log('🚑 Ethers.js Contract patched');
}

console.log('🚑 Emergency CCTP patch loaded successfully');