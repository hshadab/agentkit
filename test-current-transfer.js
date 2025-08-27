const { ethers } = require('ethers');

async function testTransfer() {
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey);
    
    const toBytes32 = (addr) => {
        const cleaned = addr.toLowerCase().replace('0x', '');
        return '0x' + cleaned.padStart(64, '0');
    };
    
    const domain = {
        name: "GatewayWallet",
        version: "1"
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
    
    // Test each chain
    const chains = [
        { name: 'Ethereum', domain: 0, token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
        { name: 'Base', domain: 6, token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
        { name: 'Avalanche', domain: 1, token: '0x5425890298aed601595a70AB815c96711a31Bc65' }
    ];
    
    for (const chain of chains) {
        console.log(`\nTesting ${chain.name} (domain ${chain.domain})...`);
        
        const message = {
            maxBlockHeight: ethers.BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007913129639935"),
            maxFee: ethers.BigNumber.from("2001000"), // 2.001 USDC
            spec: {
                version: 1,
                sourceDomain: 0,
                destinationDomain: chain.domain,
                sourceContract: toBytes32("0x0077777d7EBA4688BDeF3E311b846F25870A19B9"),
                destinationContract: toBytes32("0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"),
                sourceToken: toBytes32("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
                destinationToken: toBytes32(chain.token),
                sourceDepositor: toBytes32(wallet.address),
                destinationRecipient: toBytes32(wallet.address),
                sourceSigner: toBytes32(wallet.address),
                destinationCaller: toBytes32("0x0000000000000000000000000000000000000000"),
                value: ethers.BigNumber.from("2000000"), // 2 USDC
                salt: toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
                hookData: "0x"
            }
        };
        
        const signature = await wallet._signTypedData(domain, types, message);
        
        const requestBody = [{
            burnIntent: {
                maxBlockHeight: message.maxBlockHeight.toString(),
                maxFee: message.maxFee.toString(),
                spec: message.spec
            },
            signature: signature
        }];
        
        try {
            const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            
            if (response.ok && result.transferId) {
                console.log(`✅ SUCCESS - Transfer ID: ${result.transferId}`);
            } else {
                console.log(`❌ REJECTED - Error: ${result.message || JSON.stringify(result)}`);
            }
        } catch (error) {
            console.log(`❌ FAILED - ${error.message}`);
        }
    }
}

testTransfer().catch(console.error);