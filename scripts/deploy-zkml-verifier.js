#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const NETWORKS = {
    'sepolia': {
        rpc: 'https://eth-sepolia.g.alchemy.com/v2/demo',
        chainId: 11155111,
        explorer: 'https://sepolia.etherscan.io'
    },
    'base-sepolia': {
        rpc: 'https://base-sepolia.g.alchemy.com/v2/demo', 
        chainId: 84532,
        explorer: 'https://sepolia.basescan.org'
    },
    'iotex-testnet': {
        rpc: 'https://babel-api.testnet.iotex.io',
        chainId: 4690,
        explorer: 'https://testnet.iotexscan.io'
    }
};

async function deployZKMLVerifier(network = 'sepolia') {
    console.log('🚀 Deploying ZKMLNovaVerifier to', network);
    
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
        throw new Error(`Unknown network: ${network}`);
    }
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
    
    // Use demo private key (in production, use secure key management)
    const privateKey = process.env.PRIVATE_KEY || 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📝 Deployer address:', wallet.address);
    
    // Get balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
        console.log('⚠️  Warning: Account has no balance. Deployment will fail.');
        console.log('   Get test ETH from faucet:', 
            network === 'sepolia' ? 'https://sepoliafaucet.com' :
            network === 'base-sepolia' ? 'https://faucet.quicknode.com/base/sepolia' :
            'https://faucet.testnet.iotex.io');
        return;
    }
    
    // Read contract bytecode and ABI
    // Note: In production, use Hardhat or Foundry for compilation
    console.log('📖 Reading contract artifacts...');
    
    // For now, return the deployment info for manual deployment
    const deploymentInfo = {
        network: network,
        deploymentTime: new Date().toISOString(),
        contracts: {
            zkmlNovaVerifier: {
                contractName: 'ZKMLNovaVerifier',
                sourceFile: 'contracts/ZKMLNovaVerifier.sol',
                estimatedGas: '~1.5M gas',
                deploymentCost: '~0.003 ETH',
                verificationCost: '~150k gas per proof'
            }
        },
        deployer: wallet.address,
        networkConfig: networkConfig
    };
    
    // Save deployment info
    const deploymentPath = path.join(__dirname, '..', 'deployments', `zkml-verifier-${network}.json`);
    await fs.writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('✅ Deployment info saved to:', deploymentPath);
    console.log('\n📋 Next steps:');
    console.log('1. Compile contract with: npx hardhat compile');
    console.log('2. Deploy with: npx hardhat run scripts/deploy-zkml-verifier.js --network', network);
    console.log('3. Verify on explorer:', networkConfig.explorer);
    
    return deploymentInfo;
}

// Run if called directly
if (require.main === module) {
    const network = process.argv[2] || 'sepolia';
    deployZKMLVerifier(network)
        .then(info => {
            console.log('\n📊 Deployment summary:');
            console.log(JSON.stringify(info, null, 2));
        })
        .catch(console.error);
}

module.exports = { deployZKMLVerifier };