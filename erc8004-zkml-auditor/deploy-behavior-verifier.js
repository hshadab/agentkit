/**
 * Deploy AgentBehaviorVerifier (Groth16) to Base Sepolia
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

const BASE_SEPOLIA_RPC = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  console.log('\n🚀 Deploying Agent Behavior Verifier to Base Sepolia\n');

  // Read the compiled verifier contract
  const verifierSource = fs.readFileSync(
    path.join(__dirname, 'contracts/AgentBehaviorVerifier.sol'),
    'utf8'
  );

  // Setup provider and wallet
  const network = {
    name: 'base-sepolia',
    chainId: 84532
  };

  const provider = new ethers.providers.StaticJsonRpcProvider(BASE_SEPOLIA_RPC, network);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Deploying from: ${wallet.address}`);

  // Check balance
  const balance = await wallet.getBalance();
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.isZero()) {
    throw new Error('Insufficient ETH for deployment. Get testnet ETH from https://www.alchemy.com/faucets/base-sepolia');
  }

  // Compile contract using solc
  const solc = require('solc');

  const input = {
    language: 'Solidity',
    sources: {
      'AgentBehaviorVerifier.sol': {
        content: verifierSource
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  console.log('📝 Compiling contract...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      throw new Error('Compilation failed');
    }
  }

  const contract = output.contracts['AgentBehaviorVerifier.sol']['Groth16Verifier'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Contract compiled successfully\n');

  // Deploy
  console.log('🔨 Deploying contract...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const verifier = await factory.deploy();

  console.log(`📤 Transaction sent: ${verifier.deployTransaction.hash}`);
  console.log('⏳ Waiting for confirmation...\n');

  await verifier.deployed();

  console.log('✅ Contract deployed successfully!\n');
  console.log('📋 Deployment Details:');
  console.log(`   Contract Address: ${verifier.address}`);
  console.log(`   Transaction Hash: ${verifier.deployTransaction.hash}`);
  console.log(`   Block Number: ${verifier.deployTransaction.blockNumber || 'pending'}`);
  console.log(`   Gas Used: ~${verifier.deployTransaction.gasLimit?.toString() || 'unknown'}`);
  console.log(`   Explorer: https://sepolia.basescan.org/address/${verifier.address}\n`);

  // Save deployment info
  const deploymentInfo = {
    network: 'base-sepolia',
    chainId: 84532,
    contractName: 'AgentBehaviorVerifier',
    address: verifier.address,
    transactionHash: verifier.deployTransaction.hash,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    explorer: `https://sepolia.basescan.org/address/${verifier.address}`
  };

  fs.writeFileSync(
    path.join(__dirname, 'deployment-behavior-verifier.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('💾 Deployment info saved to deployment-behavior-verifier.json\n');

  return verifier.address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! Verifier address: ${address}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error);
    process.exit(1);
  });
