#!/usr/bin/env node

// Test different Gateway API formats to find what works

const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';

async function testFormat1() {
    console.log('Testing Format 1: SignedBurnIntent wrapper...');
    
    const data = [{
        SignedBurnIntent: {
            burnIntent: {
                maxBlockHeight: 999999999,
                maxFee: "1000000",
                spec: {
                    version: 0,
                    sourceDomain: 0,
                    destinationDomain: 0,
                    sourceContract: "0x" + "0".repeat(64),
                    destinationContract: "0x" + "0".repeat(64),
                    sourceToken: "0x" + "0".repeat(64),
                    destinationToken: "0x" + "0".repeat(64),
                    sourceDepositor: "0x" + "0".repeat(64),
                    destinationRecipient: "0x" + "742d35Cc6634C0532925a3b844Bc9e7595f0bEb".toLowerCase().replace('0x', '').padStart(64, '0'),
                    sourceSigner: "0x" + "0".repeat(64),
                    destinationCaller: "0x" + "0".repeat(64),
                    value: "10000",
                    salt: "0x" + "0".repeat(64),
                    hookData: "0x"
                }
            },
            signature: "0x" + "a".repeat(130)
        }
    }];
    
    try {
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.text();
        console.log('Response:', result.substring(0, 200));
    } catch (error) {
        console.log('Error:', error.message);
    }
}

async function testFormat2() {
    console.log('\nTesting Format 2: Direct object without wrapper...');
    
    const data = [{
        burnIntent: {
            maxBlockHeight: 999999999,
            maxFee: "1000000",
            spec: {
                // Same spec as above
                version: 0,
                sourceDomain: 0,
                destinationDomain: 0,
                value: "10000",
                // ... rest of fields
            }
        },
        signature: "0x" + "a".repeat(130)
    }];
    
    try {
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.text();
        console.log('Response:', result.substring(0, 200));
    } catch (error) {
        console.log('Error:', error.message);
    }
}

async function testFormat3() {
    console.log('\nTesting Format 3: SignedBurnIntentSet...');
    
    const data = {
        SignedBurnIntentSet: {
            burnIntents: [{
                maxBlockHeight: 999999999,
                maxFee: "1000000",
                spec: {
                    // Transfer spec
                }
            }],
            signatures: ["0x" + "a".repeat(130)]
        }
    };
    
    try {
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([data])
        });
        
        const result = await response.text();
        console.log('Response:', result.substring(0, 200));
    } catch (error) {
        console.log('Error:', error.message);
    }
}

async function main() {
    console.log('Testing Gateway API formats...\n');
    await testFormat1();
    await testFormat2();
    await testFormat3();
}

main();