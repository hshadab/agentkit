#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
require('dotenv').config();

// Avalanche Fuji testnet configuration
const AVALANCHE_FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const CHAIN_ID = 43113;

async function compileAndDeploy() {
    try {
        console.log('🔷 Deploying Real Groth16 Verifier (Proof of Proof) to Avalanche Fuji...\n');
        
        // Read the real verifier contract
        const contractPath = path.join(__dirname, '../contracts/RealProofOfProofVerifier_New.sol');
        const source = fs.readFileSync(contractPath, 'utf8');
        
        console.log('Compiling RealProofOfProofVerifier_New.sol...');
        
        // Prepare input for solc
        const input = {
            language: 'Solidity',
            sources: {
                'Groth16Verifier.sol': {
                    content: source
                }
            },
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode.object']
                    }
                }
            }
        };
        
        // Compile
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        
        if (output.errors) {
            output.errors.forEach(err => {
                if (err.severity === 'error') {
                    console.error('Compilation error:', err.formattedMessage);
                }
            });
            
            if (output.errors.some(err => err.severity === 'error')) {
                throw new Error('Compilation failed');
            }
        }
        
        // Extract contract data
        const contract = output.contracts['Groth16Verifier.sol']['Groth16Verifier'];
        const bytecode = '0x' + contract.evm.bytecode.object;
        const abi = contract.abi;
        
        console.log('✅ Compilation successful!');
        console.log('Contract name: Groth16Verifier');
        console.log('Functions:', abi.filter(item => item.type === 'function').map(f => f.name));
        
        // Initialize Web3
        const web3 = new Web3(AVALANCHE_FUJI_RPC);
        
        // Check connection
        const chainId = await web3.eth.getChainId();
        console.log(`\nConnected to chain ID: ${chainId}`);
        if (Number(chainId) !== CHAIN_ID) {
            throw new Error(`Wrong chain! Expected ${CHAIN_ID}, got ${chainId}`);
        }
        
        // Get account from private key
        let privateKey = process.env.AVALANCHE_PRIVATE_KEY;
        if (!privateKey) {
            console.error('❌ Error: AVALANCHE_PRIVATE_KEY not found in environment variables');
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
            return;
        }
        
        // Deploy contract
        console.log('\n🚀 Deploying contract...');
        const contractInstance = new web3.eth.Contract(abi);
        
        const deployment = contractInstance.deploy({ data: bytecode });
        const gasEstimate = await deployment.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();
        
        console.log(`Gas estimate: ${gasEstimate}`);
        console.log(`Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
        
        const deployedContract = await deployment.send({
            from: account.address,
            gas: String(Math.floor(Number(gasEstimate) * 1.2)),
            gasPrice: String(gasPrice)
        });
        
        const contractAddress = deployedContract.options.address;
        console.log('\n✅ Contract deployed successfully!');
        console.log(`Contract address: ${contractAddress}`);
        console.log(`Explorer URL: https://testnet.snowtrace.io/address/${contractAddress}`);
        
        // Save deployment info
        const deploymentInfo = {
            network: 'avalanche-fuji',
            chainId: CHAIN_ID,
            contractAddress: contractAddress,
            contractName: 'Groth16Verifier (Real Proof of Proof)',
            contractType: 'RealProofOfProofVerifier_New',
            deployer: account.address,
            deploymentTime: new Date().toISOString(),
            explorerUrl: `https://testnet.snowtrace.io/address/${contractAddress}`,
            verificationKeyInfo: {
                description: 'Circuit-specific verification key for Nova proof-of-proof',
                publicSignalsCount: 6
            }
        };
        
        const deploymentPath = path.join(__dirname, '../data/deployment-avalanche-fuji-real.json');
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
        
        // Update instructions
        console.log('\n📝 Next steps:');
        console.log('1. Update /static/js/config.js with:');
        console.log(`   zkVerifier: '${contractAddress}'`);
        console.log('2. Update /static/avalanche-verifier.js fallback address');
        console.log('3. Test with actual proofs from the agent kit');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
compileAndDeploy();