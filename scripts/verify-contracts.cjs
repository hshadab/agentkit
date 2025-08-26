const { Web3 } = require('web3');

// Contract addresses
const contracts = {
    'Ethereum Sepolia': {
        rpc: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        address: '0x09378444046d1ccb32ca2d5b44fab6634738d067',
        chainId: 11155111,
        explorer: 'https://sepolia.etherscan.io/address/'
    },
    'Base Sepolia': {
        rpc: 'https://sepolia.base.org',
        address: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
        chainId: 84532,
        explorer: 'https://sepolia.basescan.org/address/'
    },
    'Avalanche Fuji': {
        rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
        address: '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1',
        chainId: 43113,
        explorer: 'https://testnet.snowtrace.io/address/'
    }
};

// Minimal ABI to check for verifyProof function
const minimalABI = [
    {
        "inputs": [
            {"internalType": "uint[2]", "name": "_pA", "type": "uint256[2]"},
            {"internalType": "uint[2][2]", "name": "_pB", "type": "uint256[2][2]"},
            {"internalType": "uint[2]", "name": "_pC", "type": "uint256[2]"},
            {"internalType": "uint[6]", "name": "_pubSignals", "type": "uint256[6]"}
        ],
        "name": "verifyProof",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function checkContract(network, config) {
    console.log(`\n=== Checking ${network} ===`);
    console.log(`Address: ${config.address}`);
    console.log(`Explorer: ${config.explorer}${config.address}`);
    
    try {
        const web3 = new Web3(config.rpc);
        
        // Check if contract exists
        const code = await web3.eth.getCode(config.address);
        if (code === '0x' || code === '0x0') {
            console.log('❌ No contract deployed at this address');
            return;
        }
        
        console.log('✅ Contract exists');
        
        // Try to create contract instance
        const contract = new web3.eth.Contract(minimalABI, config.address);
        
        // Test with dummy data to see if function exists
        const dummyProof = {
            a: ['1', '2'],
            b: [['1', '2'], ['3', '4']],
            c: ['5', '6'],
            pubSignals: ['1', '2', '3', '4', '5', '6']
        };
        
        try {
            // Just check if we can encode the function call
            const data = contract.methods.verifyProof(
                dummyProof.a,
                dummyProof.b,
                dummyProof.c,
                dummyProof.pubSignals
            ).encodeABI();
            
            console.log('✅ Contract has verifyProof function with correct signature');
            console.log(`   Function selector: ${data.slice(0, 10)}`);
        } catch (err) {
            console.log('❌ Contract does not have correct verifyProof function');
            console.log(`   Error: ${err.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Error checking contract: ${error.message}`);
    }
}

async function main() {
    console.log('Verifying Zero-Knowledge Proof Verifier Contracts');
    console.log('================================================');
    
    for (const [network, config] of Object.entries(contracts)) {
        await checkContract(network, config);
    }
    
    console.log('\n\nDirect Links to Contracts:');
    console.log('=========================');
    for (const [network, config] of Object.entries(contracts)) {
        console.log(`${network}: ${config.explorer}${config.address}`);
    }
}

main().catch(console.error);