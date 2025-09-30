/**
 * Deploy JOLT Decision Verifier to Base Sepolia
 * Simple deployment script using ethers.js
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration
const RPC_URL = process.env.BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY;
const VERIFIER_SOL_PATH = path.join(__dirname, '../../circuits/jolt-verifier/JOLTDecisionSimpleVerifier.sol');
const DEPLOYMENTS_PATH = path.join(__dirname, '../contracts/deployments.json');

async function deploy() {
  console.log('\n🚀 Deploying JOLT Verifier to Base Sepolia');
  console.log('='.repeat(60));

  if (!PRIVATE_KEY || PRIVATE_KEY === '0x...') {
    console.error('❌ BASE_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  try {
    // Connect to Base Sepolia
    console.log('\n📡 Connecting to Base Sepolia...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    const balance = await provider.getBalance(address);

    console.log(`✅ Connected`);
    console.log(`   Deployer: ${address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error('\n❌ No ETH in wallet. Get testnet ETH from:');
      console.log('   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
      process.exit(1);
    }

    // Read verifier source
    console.log('\n📄 Reading verifier contract...');
    const verifierSource = fs.readFileSync(VERIFIER_SOL_PATH, 'utf8');
    console.log(`   Source: ${VERIFIER_SOL_PATH}`);

    // Compile with solc
    console.log('\n⚙️  Compiling contract...');
    const solc = require('solc');

    const input = {
      language: 'Solidity',
      sources: {
        'Verifier.sol': {
          content: verifierSource
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
        console.error('❌ Compilation errors:');
        errors.forEach(e => console.error(e.formattedMessage));
        process.exit(1);
      }
    }

    const contract = output.contracts['Verifier.sol']['Groth16Verifier'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log(`✅ Compiled successfully`);
    console.log(`   Bytecode size: ${bytecode.length / 2} bytes`);

    // Deploy contract
    console.log('\n📤 Deploying to Base Sepolia...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log('   Estimating gas...');
    const deployTx = await factory.getDeployTransaction();
    const gasEstimate = await provider.estimateGas(deployTx);
    console.log(`   Estimated gas: ${gasEstimate.toString()}`);

    console.log('   Sending transaction...');
    const contract_instance = await factory.deploy();
    const deploymentTx = contract_instance.deploymentTransaction();

    console.log(`   Transaction hash: ${deploymentTx.hash}`);
    console.log('   Waiting for confirmation...');

    await contract_instance.waitForDeployment();
    const contractAddress = await contract_instance.getAddress();

    console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log(`📜 Contract Address: ${contractAddress}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/address/${contractAddress}`);
    console.log(`📋 Transaction: https://sepolia.basescan.org/tx/${deploymentTx.hash}`);

    // Save deployment info
    const deploymentInfo = {
      'base-sepolia': {
        network: 'base-sepolia',
        chainId: 84532,
        contractName: 'JOLTDecisionVerifier',
        address: contractAddress,
        deployer: address,
        deploymentTx: deploymentTx.hash,
        timestamp: new Date().toISOString(),
        rpcUrl: RPC_URL,
        explorer: `https://sepolia.basescan.org/address/${contractAddress}`,
        verifierType: 'Groth16',
        publicSignals: 2,
        description: 'JOLT zkML Decision Verifier (2 params: decision, confidence)'
      }
    };

    fs.writeFileSync(DEPLOYMENTS_PATH, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to ${DEPLOYMENTS_PATH}`);

    console.log('\n🎉 Done! Update your UI to use the new contract address.');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.error) {
      console.error('   Details:', error.error.message);
    }
    process.exit(1);
  }
}

deploy();
