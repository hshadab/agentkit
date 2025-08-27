#!/usr/bin/env node

const { ethers } = require('ethers');

async function testProgrammaticSigning() {
    console.log('Testing Programmatic EIP-712 Signing\n');
    console.log('=====================================\n');
    
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey);
    
    console.log('Wallet Address:', wallet.address);
    console.log('Expected:', '0xE616B2eC620621797030E0AB1BA38DA68D78351C\n');
    
    // Helper to convert address to bytes32
    const toBytes32 = (addr) => {
        const cleaned = addr.toLowerCase().replace('0x', '');
        return '0x' + cleaned.padStart(64, '0');
    };
    
    // Create the exact burn intent from your implementation
    const burnIntent = {
        maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        maxFee: "2000001",
        spec: {
            version: 1,
            sourceDomain: 0,
            destinationDomain: 6,
            sourceContract: toBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'),
            destinationContract: toBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'),
            sourceToken: toBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
            destinationToken: toBytes32('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
            sourceDepositor: toBytes32(wallet.address),
            destinationRecipient: toBytes32('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
            sourceSigner: toBytes32(wallet.address),
            destinationCaller: toBytes32('0x0000000000000000000000000000000000000000'),
            value: "10000",
            salt: toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
            hookData: "0x"
        }
    };
    
    // EIP-712 domain
    const domain = {
        name: "GatewayWallet",
        version: "1"
    };
    
    // EIP-712 types
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
        maxBlockHeight: ethers.BigNumber.from(burnIntent.maxBlockHeight),
        maxFee: ethers.BigNumber.from(burnIntent.maxFee),
        spec: burnIntent.spec
    };
    
    // Sign the message
    console.log('Signing EIP-712 message...');
    const signature = await wallet._signTypedData(domain, types, message);
    console.log('Signature:', signature.substring(0, 66) + '...\n');
    
    // Create signed burn intent
    const signedBurnIntent = {
        burnIntent: burnIntent,
        signature: signature
    };
    
    // Test with Circle Gateway API
    console.log('Testing with Circle Gateway API...\n');
    
    const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
    
    try {
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify([signedBurnIntent])
        });
        
        const result = await response.text();
        console.log('Response Status:', response.status);
        console.log('Response:', result.substring(0, 500));
        
        if (response.ok) {
            console.log('\n✅ SUCCESS! Transfer accepted with real signature!');
            try {
                const data = JSON.parse(result);
                console.log('Transfer ID:', data.transferId || data.id);
            } catch (e) {}
        } else {
            console.log('\n❌ Transfer still failed');
            if (result.includes('signature')) {
                console.log('Issue: Signature still invalid (shouldn\'t happen with real signing)');
            } else if (result.includes('balance')) {
                console.log('Issue: Insufficient balance');
            } else {
                console.log('Issue:', result.substring(0, 200));
            }
        }
        
    } catch (error) {
        console.error('Request failed:', error.message);
    }
}

testProgrammaticSigning();