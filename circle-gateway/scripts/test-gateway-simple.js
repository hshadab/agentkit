const { ethers } = require('ethers');

async function testSimpleTransfer() {
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('Wallet address:', wallet.address);
    
    // Get chain ID
    const chainId = await provider.getNetwork().then(n => n.chainId);
    console.log('Chain ID:', chainId);
    
    // EIP-712 domain - exact match for Gateway
    const domain = {
        name: "GatewayWallet",
        version: "1",
        chainId: chainId,
        verifyingContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
    };
    
    // Types
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
    
    // Helper for bytes32
    const toBytes32 = (addr) => {
        return ethers.utils.hexZeroPad(addr.toLowerCase(), 32);
    };
    
    // Create value
    const value = {
        maxBlockHeight: ethers.constants.MaxUint256,
        maxFee: ethers.BigNumber.from("2001000"), // 2.001 USDC
        spec: {
            version: 1,
            sourceDomain: 0,
            destinationDomain: 6,
            sourceContract: toBytes32("0x0077777d7EBA4688BDeF3E311b846F25870A19B9"),
            destinationContract: toBytes32("0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"),
            sourceToken: toBytes32("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
            destinationToken: toBytes32("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
            sourceDepositor: toBytes32(wallet.address),
            destinationRecipient: toBytes32(wallet.address),
            sourceSigner: toBytes32(wallet.address),
            destinationCaller: ethers.constants.HashZero,
            value: ethers.BigNumber.from("2000000"), // 2 USDC
            salt: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
            hookData: "0x"
        }
    };
    
    console.log('\nSigning message...');
    const signature = await wallet._signTypedData(domain, types, value);
    console.log('Signature:', signature);
    
    // Prepare request
    const request = [{
        burnIntent: {
            maxBlockHeight: value.maxBlockHeight.toString(),
            maxFee: value.maxFee.toString(),
            spec: {
                ...value.spec,
                value: value.spec.value.toString()
            }
        },
        signature: signature
    }];
    
    console.log('\nSending to Gateway...');
    const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });
    
    const result = await response.json();
    console.log('\nResult:', JSON.stringify(result, null, 2));
}

testSimpleTransfer().catch(console.error);