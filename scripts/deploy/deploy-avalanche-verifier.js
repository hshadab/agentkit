#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Avalanche Fuji testnet configuration
const AVALANCHE_FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const CHAIN_ID = 43113;

// Load compiled contract
const compiledContract = require('../../build/AvalancheGroth16Verifier.json');
const CONTRACT_BYTECODE = compiledContract.bytecode;
const CONTRACT_ABI = compiledContract.abi;

async function deployToAvalanche() {
    try {
        console.log('🔷 Deploying Groth16 Verifier to Avalanche Fuji Testnet...\n');
        
        // Initialize Web3
        const web3 = new Web3(AVALANCHE_FUJI_RPC);
        
        // Check connection
        const chainId = await web3.eth.getChainId();
        console.log(`Connected to chain ID: ${chainId}`);
        if (Number(chainId) !== CHAIN_ID) {
            throw new Error(`Wrong chain! Expected ${CHAIN_ID}, got ${chainId}`);
        }
        
        // Get account from private key (you'll need to set this)
        let privateKey = process.env.AVALANCHE_PRIVATE_KEY;
        if (!privateKey) {
            console.error('❌ Error: AVALANCHE_PRIVATE_KEY not found in environment variables');
            console.log('\nTo deploy, you need to:');
            console.log('1. Export your MetaMask private key for the account');
            console.log('2. Create a .env file in the project root');
            console.log('3. Add: AVALANCHE_PRIVATE_KEY=your_private_key_here');
            console.log('\nYour deployment address should be: 0xE616B2eC620621797030E0AB1BA38DA68D78351C');
            return;
        }
        
        // Ensure private key has 0x prefix
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }
        
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        console.log(`Deploying from account: ${account.address}`);
        
        // Check balance
        const balance = await web3.eth.getBalance(account.address);
        const balanceInAvax = web3.utils.fromWei(balance, 'ether');
        console.log(`Account balance: ${balanceInAvax} AVAX`);
        
        if (parseFloat(balanceInAvax) < 0.1) {
            console.error('❌ Insufficient balance! You need at least 0.1 AVAX for deployment');
            console.log('Get test AVAX from: https://faucets.chain.link/fuji');
            return;
        }
        
        // Prepare contract deployment
        const contract = new web3.eth.Contract(CONTRACT_ABI);
        
        // Estimate gas
        console.log('\nEstimating gas...');
        const deployTx = contract.deploy({ data: CONTRACT_BYTECODE });
        const gasEstimate = await deployTx.estimateGas({ from: account.address });
        console.log(`Estimated gas: ${gasEstimate}`);
        
        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        const gasPriceGwei = web3.utils.fromWei(gasPrice, 'gwei');
        console.log(`Current gas price: ${gasPriceGwei} Gwei`);
        
        // Calculate deployment cost
        const deploymentCost = web3.utils.fromWei(
            (BigInt(gasEstimate) * BigInt(gasPrice)).toString(),
            'ether'
        );
        console.log(`Estimated deployment cost: ${deploymentCost} AVAX`);
        
        // Deploy contract
        console.log('\n🚀 Deploying contract...');
        const deployedContract = await deployTx.send({
            from: account.address,
            gas: String(Math.floor(Number(gasEstimate) * 1.2)), // Add 20% buffer
            gasPrice: String(gasPrice)
        });
        
        console.log('\n✅ Contract deployed successfully!');
        console.log(`Contract address: ${deployedContract.options.address}`);
        console.log(`Transaction hash: ${deployedContract._receipt.transactionHash}`);
        console.log(`Explorer URL: https://testnet.snowtrace.io/address/${deployedContract.options.address}`);
        
        // Save deployment info
        const deploymentInfo = {
            network: 'avalanche-fuji',
            chainId: CHAIN_ID,
            contractAddress: deployedContract.options.address,
            transactionHash: deployedContract._receipt.transactionHash,
            deployer: account.address,
            deploymentTime: new Date().toISOString(),
            explorerUrl: `https://testnet.snowtrace.io/address/${deployedContract.options.address}`
        };
        
        const deploymentPath = path.join(__dirname, '../../data/deployment-avalanche-fuji.json');
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
        
        // Update config
        console.log('\n📝 Update your config.js with:');
        console.log(`zkVerifier: '${deployedContract.options.address}'`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
deployToAvalanche();