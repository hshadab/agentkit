import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Avalanche Fuji testnet configuration
const AVALANCHE_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const CHAIN_ID = 43113;

// Load compiled contract
const compiledContract = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/MedicalRecordsIntegrity.json'), 'utf8')
);

async function deployContract() {
    console.log('🚀 Deploying MedicalRecordsIntegrity contract to Avalanche Fuji...\n');
    
    // Check for private key
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ Error: DEPLOYER_PRIVATE_KEY not found in environment variables');
        console.log('Please set your private key: export DEPLOYER_PRIVATE_KEY=0x...');
        process.exit(1);
    }
    
    try {
        // Connect to Avalanche
        const provider = new ethers.providers.JsonRpcProvider(AVALANCHE_RPC);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log('📍 Deployer address:', wallet.address);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.utils.formatEther(balance), 'AVAX');
        
        if (balance === 0n) {
            console.log('\n❌ Insufficient balance! You need AVAX to deploy.');
            console.log('Get test AVAX from: https://faucet.avax.network/');
            process.exit(1);
        }
        
        // Deploy contract
        console.log('\n📝 Deploying contract...');
        const factory = new ethers.ContractFactory(
            compiledContract.abi,
            compiledContract.bytecode,
            wallet
        );
        
        const contract = await factory.deploy();
        console.log('📄 Transaction hash:', contract.deploymentTransaction().hash);
        console.log('⏳ Waiting for confirmation...');
        
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log('\n✅ Contract deployed successfully!');
        console.log('📍 Contract address:', address);
        console.log('🔗 View on Snowtrace:', `https://testnet.snowtrace.io/address/${address}`);
        
        // Update config file
        const configPath = path.join(__dirname, '../static/js/core/config.js');
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Update the medicalIntegrity address
        configContent = configContent.replace(
            /medicalIntegrity: '0x[a-fA-F0-9]+'/,
            `medicalIntegrity: '${address}'`
        );
        
        fs.writeFileSync(configPath, configContent);
        console.log('\n📝 Updated config.js with new contract address');
        
        // Save deployment info
        const deploymentInfo = {
            network: 'avalanche-fuji',
            chainId: CHAIN_ID,
            contractAddress: address,
            deploymentTx: contract.deploymentTransaction().hash,
            deployer: wallet.address,
            timestamp: new Date().toISOString(),
            abi: compiledContract.abi
        };
        
        fs.writeFileSync(
            path.join(__dirname, '../deployments/medical-avalanche.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('\n🎉 Deployment complete!');
        console.log('\nTo interact with the contract:');
        console.log(`Contract Address: ${address}`);
        console.log(`ABI saved in: deployments/medical-avalanche.json`);
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log('\nYou need AVAX for gas fees. Get test AVAX from:');
            console.log('https://faucet.avax.network/');
        }
        process.exit(1);
    }
}

// Run deployment
deployContract();