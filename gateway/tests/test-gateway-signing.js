#!/usr/bin/env node

import { ethers } from 'ethers';
import fetch from 'node-fetch';

async function testGatewaySigning() {
    console.log('🧪 Testing Gateway Signing Flow\n');
    
    // Your private key from the code
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    
    console.log('🔑 Wallet Details:');
    console.log('   Private Key:', PRIVATE_KEY.substring(0, 10) + '...');
    console.log('   Address:', wallet.address);
    console.log('   Expected:', '0xe616b2ec620621797030e0ab1ba38da68d78351c');
    console.log('   Match:', wallet.address.toLowerCase() === '0xe616b2ec620621797030e0ab1ba38da68d78351c');
    console.log('');
    
    // Test signing
    // Use minimal domain as per Circle's requirements
    const domain = {
        name: "GatewayWallet",
        version: "1"
        // No chainId or verifyingContract - Circle uses minimal domain
    };
    
    const types = {
        BurnIntent: [
            { name: "maxBlockHeight", type: "uint256" },
            { name: "maxFee", type: "uint256" },
            { name: "spec", type: "TransferSpec" }
        ],
        TransferSpec: [
            { name: "version", type: "uint32" },
            { name: "sourceDomain", type: "uint32" },
            { name: "destinationDomain", type: "uint32" },
            { name: "sourceContract", type: "bytes32" },
            { name: "destinationContract", type: "bytes32" },
            { name: "sourceToken", type: "bytes32" },
            { name: "destinationToken", type: "bytes32" },
            { name: "sourceDepositor", type: "bytes32" },
            { name: "destinationRecipient", type: "bytes32" },
            { name: "sourceSigner", type: "bytes32" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "value", type: "uint256" },
            { name: "salt", type: "bytes32" },
            { name: "hookData", type: "bytes" }
        ]
    };
    
    // Create message with wallet address as signer
    const toBytes32 = (address) => {
        return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
    };
    
    const message = {
        maxBlockHeight: ethers.BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007913129639935"),
        maxFee: ethers.BigNumber.from("2000001"), // 2.000001 USDC (minimum required)
        spec: {
            version: 1,
            sourceDomain: 0,
            destinationDomain: 6,
            sourceContract: toBytes32("0x0077777d7EBA4688BDeF3E311b846F25870A19B9"),
            destinationContract: toBytes32("0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"),
            sourceToken: toBytes32("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
            destinationToken: toBytes32("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
            sourceDepositor: toBytes32(wallet.address),
            destinationRecipient: toBytes32("0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87"),
            sourceSigner: toBytes32(wallet.address),
            destinationCaller: toBytes32("0x0000000000000000000000000000000000000000"),
            value: ethers.BigNumber.from("10000"),
            salt: toBytes32("0x" + Date.now().toString(16)),
            hookData: "0x"
        }
    };
    
    console.log('📝 Message to Sign:');
    console.log('   sourceSigner:', message.spec.sourceSigner);
    console.log('   sourceDepositor:', message.spec.sourceDepositor);
    console.log('');
    
    try {
        // Sign the message
        const signature = await wallet._signTypedData(domain, types, message);
        console.log('✅ Signature Created:', signature.substring(0, 20) + '...');
        
        // Verify signature
        const recovered = ethers.utils.verifyTypedData(domain, types, message, signature);
        console.log('🔍 Signature Verification:');
        console.log('   Recovered:', recovered);
        console.log('   Expected:', wallet.address);
        console.log('   Match:', recovered.toLowerCase() === wallet.address.toLowerCase());
        console.log('');
        
        // Test with Circle API
        console.log('📡 Testing with Circle Gateway API...');
        
        // Convert BigNumbers to strings for JSON
        const apiMessage = {
            maxBlockHeight: message.maxBlockHeight.toString(),
            maxFee: message.maxFee.toString(),
            spec: {
                ...message.spec,
                value: message.spec.value.toString()
            }
        };
        
        // Try with raw signature string instead of r,s,v object
        const burnIntent = {
            burnIntent: apiMessage,
            signature: signature  // Use raw signature string
        };
        
        console.log('🔍 Sending to Circle:');
        console.log('   sourceSigner:', burnIntent.burnIntent.spec.sourceSigner);
        console.log('   Signature (raw):', signature.substring(0, 20) + '...');
        
        // Try sending just the burnIntent directly
        console.log('   Sending as single object (not array)');
        
        // Add API key and send as array
        const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
        const apiPayload = [burnIntent];
        
        console.log('   Using API key:', apiKey.substring(0, 20) + '...');
        console.log('   Sending as array of length:', apiPayload.length);
        
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(apiPayload)
        });
        
        const result = await response.text();
        console.log('\n📊 Circle API Response:');
        console.log('   Status:', response.status);
        console.log('   Body:', result);
        
        if (result.includes('Invalid signature')) {
            console.log('\n❌ Signature Error from Circle');
            console.log('   This means the signature format is correct but:');
            console.log('   - The signer address in the message doesn\'t match the signature');
            console.log('   - Or there\'s a domain/types mismatch');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGatewaySigning();