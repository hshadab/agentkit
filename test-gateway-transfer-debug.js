const { ethers } = require('ethers');

async function testGatewayTransfer() {
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey);
    const userAddress = wallet.address;
    
    console.log('Testing Gateway transfer for:', userAddress);
    
    // Helper to convert to bytes32
    const toBytes32 = (addr) => {
        const cleaned = addr.toLowerCase().replace('0x', '');
        return '0x' + cleaned.padStart(64, '0');
    };
    
    // EIP-712 domain - Circle Gateway only needs name and version
    const domain = {
        name: "GatewayWallet",
        version: "1"
        // DON'T include chainId or verifyingContract - causes signature mismatch
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
    
    const burnIntent = {
        maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        maxFee: "2001000", // 2.001 USDC
        spec: {
            version: 1,
            sourceDomain: 0, // Ethereum Sepolia
            destinationDomain: 6, // Base Sepolia
            sourceContract: toBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'), // Gateway Wallet
            destinationContract: toBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'), // Gateway Minter
            sourceToken: toBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'), // USDC Sepolia
            destinationToken: toBytes32('0x036CbD53842c5426634e7929541eC2318f3dCF7e'), // USDC Base Sepolia
            sourceDepositor: toBytes32(userAddress),
            destinationRecipient: toBytes32(userAddress), // Send to self
            sourceSigner: toBytes32(userAddress),
            destinationCaller: toBytes32('0x0000000000000000000000000000000000000000'),
            value: "10000", // 0.01 USDC
            salt: toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
            hookData: "0x"
        }
    };
    
    // Create message for signing
    const message = {
        maxBlockHeight: ethers.BigNumber.from(burnIntent.maxBlockHeight),
        maxFee: ethers.BigNumber.from(burnIntent.maxFee),
        spec: burnIntent.spec
    };
    
    // Sign the message
    const signature = await wallet._signTypedData(domain, types, message);
    console.log('Signature generated:', signature.substring(0, 20) + '...');
    
    // Create request body - MUST use exact signed values
    const requestBody = [{
        burnIntent: {
            maxBlockHeight: message.maxBlockHeight.toString(),
            maxFee: message.maxFee.toString(),
            spec: message.spec
        },
        signature: signature
    }];
    
    console.log('\nRequest body:', JSON.stringify(requestBody, null, 2));
    
    // Submit to Gateway
    try {
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const responseText = await response.text();
        console.log('\nResponse status:', response.status);
        console.log('Response:', responseText);
        
        try {
            const data = JSON.parse(responseText);
            if (data.success === false) {
                console.log('\n❌ Transfer rejected');
                console.log('Error:', data.message || data.error);
            } else if (data.transfers) {
                console.log('\n✅ Transfer accepted!');
                console.log('Transfer ID:', data.transfers[0].transferId);
            }
        } catch (e) {
            console.log('Raw response:', responseText);
        }
        
    } catch (error) {
        console.error('Request failed:', error);
    }
}

testGatewayTransfer().catch(console.error);