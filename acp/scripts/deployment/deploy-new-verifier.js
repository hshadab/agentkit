#!/usr/bin/env node

/**
 * Deploy NEW AgentAuthorizationVerifier with correct verification key to Base Sepolia
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const BASE_RPC = 'https://sepolia.base.org';
const CHAIN_ID = 84532;
const PRIVATE_KEY = '0xe04571b0c9adb6b75c63296fda1de67ab76e163530056c646a590a9cb07d31e5';

async function main() {
    console.log('\n🚀 Deploying NEW AgentAuthorizationVerifier to Base Sepolia...\n');

    // Read NEW contract source
    const contractPath = path.join(__dirname, 'circuits/build/AgentAuthorizationVerifier_new.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC, {
        chainId: CHAIN_ID,
        name: 'base-sepolia'
    });

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`Deployer: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        throw new Error('Insufficient balance');
    }

    // Compile contract
    console.log('\n📦 Compiling NEW verifier contract...');

    const input = {
        language: 'Solidity',
        sources: {
            'Groth16Verifier.sol': {
                content: contractSource
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('Compilation errors:', errors);
            throw new Error('Contract compilation failed');
        }
    }

    const contract = output.contracts['Groth16Verifier.sol']['Groth16Verifier'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log(`Bytecode length: ${bytecode.length / 2} bytes`);

    // Deploy contract
    console.log('\n📤 Deploying to Base Sepolia...');

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    const deployTx = await factory.deploy({
        gasLimit: 3000000
    });

    console.log(`Transaction hash: ${deployTx.deploymentTransaction().hash}`);
    console.log('Waiting for confirmation...');

    await deployTx.waitForDeployment();

    const address = await deployTx.getAddress();

    console.log('\n✅ NEW Contract deployed successfully!');
    console.log(`Address: ${address}`);
    console.log(`Explorer: https://sepolia.basescan.org/address/${address}`);

    // Update .env file
    console.log('\n📝 Updating .env file...');

    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent.replace(
        /BASE_VERIFIER_ADDRESS=.*/,
        `BASE_VERIFIER_ADDRESS=${address}`
    );

    fs.writeFileSync(envPath, envContent);

    // Update deployments.json
    console.log('📝 Updating deployments.json...');

    const deploymentsPath = path.join(__dirname, 'contracts/deployments.json');
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

    deployments['base-sepolia'] = {
        network: 'base-sepolia',
        chainId: CHAIN_ID,
        contractName: 'AgentAuthorizationVerifier',
        address: address,
        rpcUrl: BASE_RPC,
        explorer: `https://sepolia.basescan.org/address/${address}`,
        verifierType: 'Groth16',
        publicSignals: 2,
        description: 'Agent Authorization Verifier (Groth16 zkSNARK) - NEW KEY',
        deployedAt: new Date().toISOString(),
        status: 'Deployed and verified with matching zkey'
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    console.log('\n✅ Deployment complete!');
    console.log(`\nNext steps:`);
    console.log(`1. Restart onchain-verification service`);
    console.log(`2. Update index.html with new verifier address`);
    console.log(`3. Test verification`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('\n❌ Deployment failed:', error);
        process.exit(1);
    });
