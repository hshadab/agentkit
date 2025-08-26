#!/usr/bin/env node

import { ethers } from 'ethers';

// Simulate browser environment
global.window = {
    DEMO_PRIVATE_KEY: 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab',
    ethereum: undefined, // No MetaMask in test
    ethers: ethers
};

// Helper functions from gateway-workflow-manager-v2.js
function toBytes32(hex) {
    const raw = hex.replace('0x', '');
    return '0x' + raw.padStart(64, '0');
}

function toBytes32Address(addr) {
    return toBytes32(addr.toLowerCase());
}

function fromBytes32Address(bytes32) {
    return '0x' + bytes32.slice(26);
}

async function testFullWorkflow() {
    console.log('🧪 Testing Full Gateway Workflow\n');
    
    // Step 1: Check and enable programmatic signing (constructor)
    console.log('=== Step 1: Constructor - checkAndEnableProgrammaticSigning() ===');
    console.log('🔍 Checking for programmatic signing...');
    console.log('   window.DEMO_PRIVATE_KEY exists?', !!global.window.DEMO_PRIVATE_KEY);
    console.log('   Type:', typeof global.window.DEMO_PRIVATE_KEY);
    console.log('   Length:', global.window.DEMO_PRIVATE_KEY?.length);
    
    let storedPrivateKey = null;
    let storedUserAccount = null;
    
    if (global.window.DEMO_PRIVATE_KEY && 
        typeof global.window.DEMO_PRIVATE_KEY === 'string' && 
        global.window.DEMO_PRIVATE_KEY.length > 0 && 
        global.window.DEMO_PRIVATE_KEY !== 'undefined') {
        
        try {
            const formattedKey = global.window.DEMO_PRIVATE_KEY.startsWith('0x') ? 
                global.window.DEMO_PRIVATE_KEY : '0x' + global.window.DEMO_PRIVATE_KEY;
            
            const wallet = new ethers.Wallet(formattedKey);
            const expectedAddress = '0xe616b2ec620621797030e0ab1ba38da68d78351c';
            
            if (wallet.address.toLowerCase() === expectedAddress) {
                storedPrivateKey = global.window.DEMO_PRIVATE_KEY;
                console.log('🤖 AUTO-SIGNING ENABLED: Gateway will sign automatically');
                console.log('   Wallet address:', wallet.address);
                console.log('   Stored private key for later use');
            }
        } catch (error) {
            console.error('Error checking private key:', error.message);
        }
    }
    
    console.log('\n=== Step 2: executeRealGatewayTransfer() - Determine signer ===');
    
    // Simulate determining user address
    console.log('🔍 DEBUG: Determining signer address...');
    console.log('   this.userAccount (stored):', storedUserAccount);
    console.log('   this.privateKey:', storedPrivateKey ? 'SET' : 'NOT SET');
    console.log('   window.DEMO_PRIVATE_KEY:', global.window.DEMO_PRIVATE_KEY ? 'SET' : 'NOT SET');
    console.log('   window.ethereum:', global.window.ethereum ? 'AVAILABLE' : 'NOT AVAILABLE');
    
    let userAddress;
    const privateKey = storedPrivateKey || global.window.DEMO_PRIVATE_KEY;
    
    if (privateKey && typeof privateKey === 'string' && privateKey.length > 0 && privateKey !== 'undefined') {
        console.log('🔑 Found private key, creating wallet...');
        console.log('🔑 Private key value:', privateKey);
        console.log('🔑 Private key length:', privateKey.length);
        console.log('🔑 Private key starts with 0x?', privateKey.startsWith('0x'));
        
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        userAddress = wallet.address.toLowerCase();
        storedUserAccount = userAddress; // This simulates: this.userAccount = userAddress
        
        console.log('🔑 Created wallet address:', wallet.address);
        console.log('🔑 Will use programmatic signing with address:', userAddress);
        console.log('🔑 Updated this.userAccount to:', storedUserAccount);
    }
    
    console.log('\n=== Step 3: Create burn intent with determined address ===');
    
    const recipientAddress = '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87';
    
    const burnIntent = {
        spec: {
            sourceDepositor: toBytes32Address(userAddress),
            destinationRecipient: toBytes32Address(recipientAddress),
            sourceSigner: toBytes32Address(userAddress),
            // ... other fields
        }
    };
    
    console.log('📋 Burn intent created with:');
    console.log('   sourceSigner (bytes32):', burnIntent.spec.sourceSigner);
    console.log('   sourceSigner (decoded):', fromBytes32Address(burnIntent.spec.sourceSigner));
    console.log('   sourceDepositor (bytes32):', burnIntent.spec.sourceDepositor);
    
    console.log('\n=== Step 4: Signing - Extract actualSigner and compare ===');
    
    const transferSpec = burnIntent.spec;
    console.log('🔍 DEBUG: Extracting actualSigner from transferSpec.sourceSigner');
    console.log('   transferSpec.sourceSigner:', transferSpec.sourceSigner);
    const actualSigner = fromBytes32Address(transferSpec.sourceSigner);
    console.log('   actualSigner extracted:', actualSigner);
    
    // Now attempt to sign with programmatic key
    if (privateKey) {
        console.log('\n🔑 Attempting programmatic signing...');
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        
        console.log('🚨 CRITICAL CHECK - Wallet vs actualSigner:');
        console.log('   wallet.address:', wallet.address);
        console.log('   wallet.address.toLowerCase():', wallet.address.toLowerCase());
        console.log('   actualSigner:', actualSigner);
        console.log('   Match?', wallet.address.toLowerCase() === actualSigner);
        
        if (wallet.address.toLowerCase() !== actualSigner) {
            console.error('\n❌ MISMATCH DETECTED!');
            console.error('   The wallet address does not match the actualSigner from transferSpec');
            console.error('   This will cause "Invalid signature: recovered signer does not match sourceSigner"');
            console.error('\n🔍 Root cause analysis:');
            console.error('   - userAddress was:', userAddress);
            console.error('   - It got encoded to sourceSigner:', burnIntent.spec.sourceSigner);
            console.error('   - Then decoded back to actualSigner:', actualSigner);
            console.error('   - But wallet.address is:', wallet.address.toLowerCase());
        } else {
            console.log('\n✅ SUCCESS - Addresses match!');
            console.log('   Signature should be accepted by Circle Gateway');
        }
    }
}

testFullWorkflow().catch(console.error);