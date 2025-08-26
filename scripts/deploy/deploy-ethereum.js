const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Deployment configuration
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// SimplifiedZKVerifier contract bytecode and ABI
const CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50611234806100206000396000f3fe...'; // Placeholder - need to compile
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "uint256[2]", "name": "a", "type": "uint256[2]"},
                    {"internalType": "uint256[2][2]", "name": "b", "type": "uint256[2][2]"},
                    {"internalType": "uint256[2]", "name": "c", "type": "uint256[2]"}
                ],
                "internalType": "struct SimplifiedZKVerifier.Proof",
                "name": "proof",
                "type": "tuple"
            },
            {
                "components": [
                    {"internalType": "uint256", "name": "commitment", "type": "uint256"},
                    {"internalType": "uint256", "name": "proofType", "type": "uint256"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct SimplifiedZKVerifier.PublicInputs",
                "name": "inputs",
                "type": "tuple"
            },
            {"internalType": "bytes32", "name": "proofId", "type": "bytes32"}
        ],
        "name": "verifyProof",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function deployContract() {
    try {
        if (!PRIVATE_KEY) {
            console.error('Please set DEPLOYER_PRIVATE_KEY environment variable');
            process.exit(1);
        }

        // Connect to Sepolia
        const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log('Deploying from address:', wallet.address);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            console.error('Insufficient balance. Please fund your wallet with Sepolia ETH');
            console.log('Get Sepolia ETH from: https://sepoliafaucet.com/');
            process.exit(1);
        }

        // Deploy contract
        console.log('Deploying SimplifiedZKVerifier...');
        const contractFactory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, wallet);
        const contract = await contractFactory.deploy();
        
        console.log('Transaction hash:', contract.deploymentTransaction().hash);
        console.log('Waiting for confirmation...');
        
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();
        
        console.log('Contract deployed at:', contractAddress);
        console.log('View on Etherscan: https://sepolia.etherscan.io/address/' + contractAddress);
        
        // Save deployment info
        const deploymentInfo = {
            network: 'sepolia',
            address: contractAddress,
            deployer: wallet.address,
            timestamp: new Date().toISOString(),
            transactionHash: contract.deploymentTransaction().hash
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'deployment-sepolia.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('\nDeployment info saved to deployment-sepolia.json');
        console.log('\nNext steps:');
        console.log('1. Update ethereum-verifier.js with contract address:', contractAddress);
        console.log('2. Verify contract on Etherscan (optional)');
        
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deployContract();