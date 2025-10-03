const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployProofStorage() {
  // Read the Solidity contract
  const soliditySource = fs.readFileSync(
    path.join(__dirname, 'ProofStorage.sol'),
    'utf8'
  );

  console.log('Compiling ProofStorage.sol...');

  // Use solc to compile
  const solc = require('solc');

  const input = {
    language: 'Solidity',
    sources: {
      'ProofStorage.sol': {
        content: soliditySource
      }
    },
    settings: {
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
      console.error('Compilation errors:');
      errors.forEach(err => console.error(err.formattedMessage));
      process.exit(1);
    }
  }

  const contract = output.contracts['ProofStorage.sol'].ProofStorage;
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('Contract compiled successfully');
  console.log('ABI:', JSON.stringify(abi, null, 2));

  // Connect to Base Sepolia
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  const baseRpc = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
  console.log(`Connecting to Base Sepolia at ${baseRpc}...`);

  const provider = new ethers.JsonRpcProvider(baseRpc, {
    chainId: 84532,
    name: 'base-sepolia'
  });

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deploying from wallet: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy the contract
  console.log('Deploying ProofStorage contract...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contractInstance = await factory.deploy();

  console.log(`Transaction hash: ${contractInstance.deploymentTransaction().hash}`);
  console.log('Waiting for deployment confirmation...');

  await contractInstance.waitForDeployment();
  const address = await contractInstance.getAddress();

  console.log('\n✅ ProofStorage deployed successfully!');
  console.log(`Contract address: ${address}`);
  console.log(`Explorer: https://sepolia.basescan.org/address/${address}`);
  console.log(`\nAdd this to your .env:`);
  console.log(`PROOF_STORAGE_ADDRESS=${address}`);

  // Save deployment info
  const deploymentInfo = {
    address,
    abi,
    network: 'base-sepolia',
    chainId: 84532,
    deployer: wallet.address,
    deploymentTx: contractInstance.deploymentTransaction().hash,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, 'ProofStorage-deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\nDeployment info saved to ProofStorage-deployment.json');
}

deployProofStorage().catch(console.error);
