#!/usr/bin/env node

import { ethers } from 'ethers';
import fetch from 'node-fetch';

async function debugSignature() {
    console.log('🔍 Debugging Signature Issue\n');
    
    const PRIVATE_KEY = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    
    console.log('Wallet Address:', wallet.address);
    console.log('Lowercase:', wallet.address.toLowerCase());
    console.log('');
    
    const toBytes32 = (address) => {
        const normalized = address.toLowerCase().replace('0x', '');
        const padded = '0x' + normalized.padStart(64, '0');
        console.log(`  toBytes32("${address}") = "${padded}"`);
        return padded;
    };
    
    console.log('Address conversions:');
    const sourceSignerBytes32 = toBytes32(wallet.address);
    console.log('');
    
    // Test with minimal domain
    const domain = {
        name: "GatewayWallet",
        version: "1"
    };
    
    // DON'T include EIP712Domain for ethers.js
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
    
    const message = {
        maxBlockHeight: ethers.BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007913129639935"),
        maxFee: ethers.BigNumber.from("2000001"),
        spec: {
            version: 1,
            sourceDomain: 0,
            destinationDomain: 6,
            sourceContract: toBytes32("0x0077777d7EBA4688BDeF3E311b846F25870A19B9"),
            destinationContract: toBytes32("0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"),
            sourceToken: toBytes32("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
            destinationToken: toBytes32("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
            sourceDepositor: sourceSignerBytes32,
            destinationRecipient: toBytes32("0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87"),
            sourceSigner: sourceSignerBytes32,
            destinationCaller: toBytes32("0x0000000000000000000000000000000000000000"),
            value: ethers.BigNumber.from("10000"),
            salt: toBytes32("0x" + Date.now().toString(16)),
            hookData: "0x"
        }
    };
    
    console.log('Message to sign:');
    console.log('  sourceSigner:', message.spec.sourceSigner);
    console.log('  sourceDepositor:', message.spec.sourceDepositor);
    console.log('');
    
    // Sign
    const signature = await wallet._signTypedData(domain, types, message);
    console.log('Signature:', signature);
    console.log('');
    
    // Verify locally
    const recovered = ethers.utils.verifyTypedData(domain, types, message, signature);
    console.log('Local verification:');
    console.log('  Recovered:', recovered);
    console.log('  Expected:', wallet.address);
    console.log('  Match:', recovered.toLowerCase() === wallet.address.toLowerCase());
    console.log('');
    
    // Now test with Circle API
    const apiPayload = [{
        burnIntent: {
            maxBlockHeight: message.maxBlockHeight.toString(),
            maxFee: message.maxFee.toString(),
            spec: {
                ...message.spec,
                value: message.spec.value.toString()
            }
        },
        signature: signature
    }];
    
    console.log('Testing with Circle API...');
    const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838'
        },
        body: JSON.stringify(apiPayload)
    });
    
    const result = await response.text();
    console.log('Circle API Response:');
    console.log('  Status:', response.status);
    
    if (response.status === 400 && result.includes('Invalid signature')) {
        console.log('  ❌ Signature rejected by Circle');
        console.log('  Response:', result);
        
        // Decode what Circle sees
        const fromBytes32 = (bytes32) => '0x' + bytes32.slice(26);
        console.log('\nWhat Circle sees:');
        console.log('  sourceSigner (bytes32):', message.spec.sourceSigner);
        console.log('  sourceSigner (decoded):', fromBytes32(message.spec.sourceSigner));
        console.log('  Our wallet address:', wallet.address.toLowerCase());
    } else if (response.status === 400 && result.includes('Insufficient balance')) {
        console.log('  ✅ Signature accepted! (insufficient balance is expected)');
    } else if (response.status === 201) {
        console.log('  ✅ Success!', result);
    } else {
        console.log('  Response:', result);
    }
}

debugSignature().catch(console.error);