#!/usr/bin/env node

// Test if Gateway transfers are actually working

const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';

async function checkGatewayBalance() {
    console.log('Checking Gateway balance...\n');
    
    // The balance you see in UI
    console.log('UI shows:');
    console.log('  Spendable: 14.80 USDC');
    console.log('  Total: 18.80 USDC');
    console.log('  Reserved: 4.00 USDC\n');
    
    // Check if transfers actually went through
    console.log('Testing minimal transfer to see if API accepts our format...\n');
    
    const burnIntent = {
        maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        maxFee: "2000001",
        spec: {
            version: 1,
            sourceDomain: 0,
            destinationDomain: 6,
            sourceContract: "0x" + "0077777d7EBA4688BDeF3E311b846F25870A19B9".toLowerCase().padStart(64, '0'),
            destinationContract: "0x" + "0022222ABE238Cc2C7Bb1f21003F0a260052475B".toLowerCase().padStart(64, '0'),
            sourceToken: "0x" + "1c7D4B196Cb0C7B01d743Fbc6116a902379C7238".toLowerCase().padStart(64, '0'),
            destinationToken: "0x" + "036CbD53842c5426634e7929541eC2318f3dCF7e".toLowerCase().padStart(64, '0'),
            sourceDepositor: "0x" + "E616B2eC620621797030E0AB1BA38DA68D78351C".toLowerCase().replace('0x', '').padStart(64, '0'),
            destinationRecipient: "0x" + "742d35Cc6634C0532925a3b844Bc9e7595f0bEb".toLowerCase().replace('0x', '').padStart(64, '0'),
            sourceSigner: "0x" + "E616B2eC620621797030E0AB1BA38DA68D78351C".toLowerCase().replace('0x', '').padStart(64, '0'),
            destinationCaller: "0x" + "0".repeat(64),
            value: "10000",
            salt: "0x" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0'),
            hookData: "0x"
        }
    };
    
    const signedBurnIntent = {
        burnIntent: burnIntent,
        signature: "0x" + "a".repeat(130) // Demo signature
    };
    
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
        console.log('API Response Status:', response.status);
        console.log('API Response:', result.substring(0, 500));
        
        if (response.ok) {
            console.log('\n✅ SUCCESS! Gateway accepted the transfer!');
            const data = JSON.parse(result);
            console.log('Transfer details:', data);
        } else {
            console.log('\n❌ Transfer rejected by Gateway API');
            
            // Parse error
            try {
                const error = JSON.parse(result);
                if (error.message) {
                    if (error.message.includes('signature')) {
                        console.log('Reason: Invalid signature (expected - we used demo signature)');
                    } else if (error.message.includes('balance')) {
                        console.log('Reason: Insufficient balance');
                        console.log('Note: You have 14.80 USDC but each transfer needs 2.000001 USDC');
                    } else {
                        console.log('Reason:', error.message);
                    }
                }
            } catch (e) {
                console.log('Raw error:', result.substring(0, 200));
            }
        }
        
    } catch (error) {
        console.log('Request failed:', error.message);
    }
}

// Check if UI is showing fake success
console.log('=================================================');
console.log('Gateway Transfer Status Check');
console.log('=================================================\n');

console.log('The UI shows: ✅ Gateway transfers completed');
console.log('But are they real? Let\'s check...\n');

checkGatewayBalance();