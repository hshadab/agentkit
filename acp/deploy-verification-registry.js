#!/usr/bin/env node

/**
 * Deploy VerificationRegistry contract to Base Sepolia
 * This enables real on-chain verification with transaction hashes
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const VERIFIER_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || process.env.BASE_SEPOLIA_PRIVATE_KEY;

async function main() {
    console.log('🚀 Deploying VerificationRegistry Contract');
    console.log('==========================================\n');

    if (!PRIVATE_KEY) {
        console.error('❌ BASE_SEPOLIA_PRIVATE_KEY not found in .env');
        process.exit(1);
    }

    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`📍 Deployer: ${wallet.address}`);
    console.log(`🔗 Network: Base Sepolia`);
    console.log(`🔐 Groth16 Verifier: ${VERIFIER_ADDRESS}\n`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther('0.001')) {
        console.error('❌ Insufficient balance. Need at least 0.001 ETH');
        process.exit(1);
    }

    // Read contract source
    const contractPath = path.join(__dirname, 'contracts/VerificationRegistry.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');

    console.log('📝 Compiling contract...');

    // Compile with solc
    const solc = require('solc');
    const input = {
        language: 'Solidity',
        sources: {
            'VerificationRegistry.sol': { content: contractSource }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            },
            optimizer: {
                enabled: false,
                runs: 200
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('❌ Compilation errors:');
            errors.forEach(err => console.error(err.formattedMessage));
            process.exit(1);
        }
    }

    const contract = output.contracts['VerificationRegistry.sol']['VerificationRegistry'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log('✅ Contract compiled successfully\n');

    // Deploy contract
    console.log('📤 Deploying to Base Sepolia...');

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployTx = await factory.deploy(VERIFIER_ADDRESS);

    console.log(`⏳ Transaction sent: ${deployTx.deploymentTransaction().hash}`);
    console.log('⏳ Waiting for confirmation...\n');

    await deployTx.waitForDeployment();
    const registryAddress = await deployTx.getAddress();

    console.log('✅ CONTRACT DEPLOYED SUCCESSFULLY!\n');
    console.log('📋 Deployment Details:');
    console.log(`   Address: ${registryAddress}`);
    console.log(`   TX Hash: ${deployTx.deploymentTransaction().hash}`);
    console.log(`   Network: Base Sepolia`);
    console.log(`   Verifier: ${VERIFIER_ADDRESS}\n`);

    console.log('🔗 View on Basescan:');
    console.log(`   https://sepolia.basescan.org/address/${registryAddress}\n`);

    // Update deployments.json
    const deploymentsPath = path.join(__dirname, 'contracts/deployments.json');
    let deployments = {};

    if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    deployments['base-sepolia'] = {
        verifier: VERIFIER_ADDRESS,
        registry: registryAddress,
        deploymentTx: deployTx.deploymentTransaction().hash,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log('✅ Updated contracts/deployments.json\n');

    // Update .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (envContent.includes('BASE_REGISTRY_ADDRESS')) {
        envContent = envContent.replace(
            /BASE_REGISTRY_ADDRESS=.*/,
            `BASE_REGISTRY_ADDRESS=${registryAddress}`
        );
    } else {
        envContent += `\nBASE_REGISTRY_ADDRESS=${registryAddress}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file\n');

    console.log('🎉 Deployment complete!');
    console.log('📝 Next steps:');
    console.log('   1. Restart verification service: node services/onchain-verification-service.js');
    console.log('   2. Test verification: it will now create real transactions');
    console.log('   3. Each verification will cost ~0.0001-0.0005 ETH gas\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
