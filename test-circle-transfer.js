const { ethers } = require('ethers');

async function testCircleTransfer() {
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const userAddress = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
    
    // Test transfer to Base (domain 6)
    const amount = '2000000'; // 2 USDC (6 decimals)
    
    // Helper function to convert to bytes32
    const toBytes32 = (addr) => {
        const cleaned = addr.toLowerCase().replace('0x', '');
        return '0x' + cleaned.padStart(64, '0');
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
    
    // Create burn intent message
    const burnIntent = {
        maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        maxFee: "2001000", // 2.001 USDC fee
        spec: {
            version: 1,
            sourceDomain: 0, // Ethereum Sepolia
            destinationDomain: 6, // Base Sepolia
            sourceContract: toBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'),
            destinationContract: toBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'),
            sourceToken: toBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
            destinationToken: toBytes32('0x036CbD53842c5426634e7929541eC2318f3dCF7e'), // Base USDC
            sourceDepositor: toBytes32(userAddress),
            destinationRecipient: toBytes32(userAddress),
            sourceSigner: toBytes32(userAddress),
            destinationCaller: toBytes32('0x0000000000000000000000000000000000000000'),
            value: amount,
            salt: toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
            hookData: "0x"
        }
    };
    
    // For ethers v6, use BigInt directly
    const message = {
        maxBlockHeight: BigInt(burnIntent.maxBlockHeight),
        maxFee: BigInt(burnIntent.maxFee),
        spec: burnIntent.spec
    };
    
    // Sign with ethers v6
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(domain, types, message);
    console.log('Signature generated:', signature);
    
    // Create signed burn intent
    const signedBurnIntent = {
        burnIntent: {
            maxBlockHeight: message.maxBlockHeight.toString(),
            maxFee: message.maxFee.toString(),
            spec: message.spec
        },
        signature: signature
    };
    
    console.log('Sending transfer request to Circle Gateway...');
    
    // Submit to Gateway API
    const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([signedBurnIntent])
    });
    
    const responseData = await response.json();
    console.log('Gateway response:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && (responseData.transferId || (responseData.transfers && responseData.transfers.length > 0))) {
        console.log('✅ Transfer successful!');
        const transferId = responseData.transferId || responseData.transfers[0].transferId;
        const attestation = responseData.attestation || responseData.transfers[0].attestation;
        console.log('Transfer ID:', transferId);
        console.log('Attestation (length):', attestation ? attestation.length : 'N/A');
        
        // Check balance after transfer
        const balanceResponse = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: "USDC",
                sources: [
                    { domain: 0, depositor: userAddress },
                    { domain: 6, depositor: userAddress }
                ]
            })
        });
        
        const balanceData = await balanceResponse.json();
        console.log('\nBalance after transfer:');
        balanceData.balances.forEach(b => {
            console.log(`  Domain ${b.domain}: ${b.balance} USDC`);
        });
        
    } else {
        console.log('❌ Transfer failed:', responseData);
    }
}

testCircleTransfer().catch(console.error);