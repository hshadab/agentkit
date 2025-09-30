/**
 * Deploy AgentAuthorization Groth16 Verifier to Base Sepolia
 * This creates the on-chain verifier contract for proof-of-proof verification
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Configuration
const NETWORK = 'base-sepolia';
const RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY;
const CHAIN_ID = 84532;

// Paths
const VERIFIER_CONTRACT_PATH = path.join(__dirname, '../circuits/build/AgentAuthorizationVerifier.sol');
const DEPLOYMENT_OUTPUT = path.join(__dirname, 'deployments.json');

async function deployVerifier() {
  console.log('\n🚀 Deploying AgentAuthorization Verifier to Base Sepolia');
  console.log('='.repeat(60));

  // Validate environment
  if (!PRIVATE_KEY || PRIVATE_KEY === '0x...') {
    console.error('❌ Error: BASE_PRIVATE_KEY not set in .env');
    console.log('\nPlease set in /home/hshadab/agentkit/acp/.env:');
    console.log('BASE_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE');
    process.exit(1);
  }

  // Check if verifier contract exists
  if (!fs.existsSync(VERIFIER_CONTRACT_PATH)) {
    console.error(`❌ Error: Verifier contract not found at ${VERIFIER_CONTRACT_PATH}`);
    console.log('\nPlease run: cd circuits && ./compile-circuit.sh');
    process.exit(1);
  }

  try {
    // Connect to Base Sepolia
    console.log(`\n📡 Connecting to ${NETWORK}...`);
    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: CHAIN_ID,
      name: NETWORK
    });

    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    const balance = await provider.getBalance(address);

    console.log(`✅ Connected to ${NETWORK}`);
    console.log(`   Deployer: ${address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error('\n❌ Error: Deployer wallet has no ETH');
      console.log(`\nPlease fund ${address} with Base Sepolia ETH:`);
      console.log('   Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
      process.exit(1);
    }

    // Read and compile verifier contract
    console.log('\n📄 Reading verifier contract...');
    const verifierSource = fs.readFileSync(VERIFIER_CONTRACT_PATH, 'utf8');

    // Extract contract name (should be "Groth16Verifier")
    const contractNameMatch = verifierSource.match(/contract\s+(\w+)/);
    const contractName = contractNameMatch ? contractNameMatch[1] : 'Groth16Verifier';

    console.log(`   Contract: ${contractName}`);
    console.log(`   Source: ${VERIFIER_CONTRACT_PATH}`);

    // Compile contract (simplified - in production use Hardhat/Foundry)
    console.log('\n⚙️  Compiling contract...');

    // For now, use solc-js to compile
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
        errors.forEach(err => console.error(err.formattedMessage));
        process.exit(1);
      }
    }

    const contract = output.contracts['Verifier.sol'][contractName];
    const abi = contract.abi;
    const bytecode = '0x' + contract.evm.bytecode.object;

    console.log(`✅ Contract compiled`);
    console.log(`   Bytecode size: ${bytecode.length / 2 - 1} bytes`);

    // Estimate gas
    console.log('\n⛽ Estimating gas...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployTx = await factory.getDeployTransaction();
    const gasEstimate = await provider.estimateGas(deployTx);
    const gasPrice = (await provider.getFeeData()).gasPrice;
    const estimatedCost = gasEstimate * gasPrice;

    console.log(`   Gas estimate: ${gasEstimate.toString()}`);
    console.log(`   Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`   Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);

    // Deploy contract
    console.log('\n🚀 Deploying contract...');
    console.log('   (This may take 30-60 seconds)');

    const verifierContract = await factory.deploy();
    await verifierContract.waitForDeployment();

    const contractAddress = await verifierContract.getAddress();
    const deploymentTx = verifierContract.deploymentTransaction();

    console.log('✅ Contract deployed!');
    console.log(`   Address: ${contractAddress}`);
    console.log(`   TX hash: ${deploymentTx.hash}`);
    console.log(`   Block: ${deploymentTx.blockNumber || 'pending'}`);
    console.log(`   Explorer: https://sepolia.basescan.org/address/${contractAddress}`);

    // Test verification function
    console.log('\n🧪 Testing verifier contract...');
    try {
      // Read test proof
      const proofPath = path.join(__dirname, '../circuits/build/proof.json');
      const publicPath = path.join(__dirname, '../circuits/build/public.json');

      if (fs.existsSync(proofPath) && fs.existsSync(publicPath)) {
        const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
        const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

        // Format proof for contract
        const proofArgs = [
          proof.pi_a.slice(0, 2),
          [proof.pi_b[0].slice(0).reverse(), proof.pi_b[1].slice(0).reverse()],
          proof.pi_c.slice(0, 2)
        ];

        // Call verifyProof
        const isValid = await verifierContract.verifyProof(
          proofArgs[0],
          proofArgs[1],
          proofArgs[2],
          publicSignals
        );

        console.log(`   Test proof verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      } else {
        console.log('   ⚠️  No test proof found, skipping verification test');
      }
    } catch (error) {
      console.log(`   ⚠️  Test failed: ${error.message}`);
    }

    // Save deployment info
    console.log('\n💾 Saving deployment info...');
    const deployment = {
      network: NETWORK,
      chainId: CHAIN_ID,
      contractName,
      address: contractAddress,
      deployer: address,
      deploymentTx: deploymentTx.hash,
      timestamp: new Date().toISOString(),
      rpcUrl: RPC_URL,
      explorer: `https://sepolia.basescan.org/address/${contractAddress}`
    };

    // Load existing deployments
    let deployments = {};
    if (fs.existsSync(DEPLOYMENT_OUTPUT)) {
      deployments = JSON.parse(fs.readFileSync(DEPLOYMENT_OUTPUT, 'utf8'));
    }

    deployments[NETWORK] = deployment;
    fs.writeFileSync(DEPLOYMENT_OUTPUT, JSON.stringify(deployments, null, 2));

    console.log(`✅ Deployment saved to ${DEPLOYMENT_OUTPUT}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Deployment Complete!');
    console.log('='.repeat(60));
    console.log(`\n📝 Contract Address: ${contractAddress}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/address/${contractAddress}`);
    console.log(`📄 TX: https://sepolia.basescan.org/tx/${deploymentTx.hash}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Update .env with: BASE_VERIFIER_ADDRESS=${contractAddress}`);
    console.log(`  2. Restart services: ./stop-all-services.sh && ./start-all-services.sh`);
    console.log(`  3. Test on-chain verification: npm run test:onchain`);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('\nInsufficient funds. Please fund your wallet with Base Sepolia ETH:');
      console.log('https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    }
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  deployVerifier().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { deployVerifier };