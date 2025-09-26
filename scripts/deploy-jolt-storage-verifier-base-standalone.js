#!/usr/bin/env node
// Deploys Groth16 verifier + JOLTDecisionVerifierWithStorage to Base Sepolia using solc-js + ethers v6

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

function compileContracts() {
  const sources = {
    'Groth16JoltDecisionSimple.sol': {
      content: fs.readFileSync(path.join(__dirname, '..', 'contracts', 'Groth16JoltDecisionSimple.sol'), 'utf8'),
    },
    'JOLTDecisionVerifierWithStorage.sol': {
      content: fs.readFileSync(path.join(__dirname, '..', 'contracts', 'JOLTDecisionVerifierWithStorage.sol'), 'utf8'),
    },
  };
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const fatal = output.errors.find(e => e.severity === 'error');
    if (fatal) throw new Error('Solc error: ' + fatal.formattedMessage);
  }
  const groth = output.contracts['Groth16JoltDecisionSimple.sol']['Groth16Verifier'];
  const storage = output.contracts['JOLTDecisionVerifierWithStorage.sol']['JOLTDecisionVerifierWithStorage'];
  return {
    grothAbi: groth.abi,
    grothBytecode: '0x' + groth.evm.bytecode.object,
    storageAbi: storage.abi,
    storageBytecode: '0x' + storage.evm.bytecode.object,
  };
}

async function main() {
  const rpc = process.env.BASE_RPC_URL || process.env.ETH_RPC || 'https://sepolia.base.org';
  const pk = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.GROTH16_PRIVATE_KEY;
  if (!pk) throw new Error('Missing BASE_PRIVATE_KEY/PRIVATE_KEY');
  const provider = new ethers.JsonRpcProvider(rpc, { chainId: 84532, name: 'base-sepolia' });
  const wallet = new ethers.Wallet(pk, provider);

  console.log(`[deploy] Network: Base Sepolia`);
  console.log(`[deploy] Deployer: ${wallet.address}`);

  const { grothAbi, grothBytecode, storageAbi, storageBytecode } = compileContracts();

  // Deploy Groth16 verifier
  const GrothFactory = new ethers.ContractFactory(grothAbi, grothBytecode, wallet);
  const groth = await GrothFactory.deploy();
  const grothRcpt = await groth.deploymentTransaction().wait();
  const grothAddr = await groth.getAddress();
  console.log(`[deploy] Groth16Verifier at ${grothAddr} (tx: ${grothRcpt.hash})`);

  // Deploy storage verifier
  const StorageFactory = new ethers.ContractFactory(storageAbi, storageBytecode, wallet);
  const storage = await StorageFactory.deploy(grothAddr);
  const storageRcpt = await storage.deploymentTransaction().wait();
  const storageAddr = await storage.getAddress();
  console.log(`[deploy] JOLTDecisionVerifierWithStorage at ${storageAddr} (tx: ${storageRcpt.hash})`);

  const sepoliaDeploymentPath = path.join(__dirname, '..', 'deployments', 'jolt-storage-verifier-sepolia.json');
  let abi = [];
  try { abi = JSON.parse(fs.readFileSync(sepoliaDeploymentPath, 'utf8')).abi || []; } catch {}
  const baseOutPath = path.join(__dirname, '..', 'deployments', 'jolt-storage-verifier-base-sepolia.json');
  const out = {
    network: 'base-sepolia',
    address: storageAddr,
    groth16Verifier: grothAddr,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    abi,
    type: 'storage',
    note: 'JOLT storage verifier deployed on Base Sepolia',
  };
  fs.writeFileSync(baseOutPath, JSON.stringify(out, null, 2));
  console.log(`[deploy] Wrote ${baseOutPath}`);

  console.log('\nSet env:');
  console.log(`  export ZKML_VERIFIER_ADDRESS=${storageAddr}`);
  console.log(`  export ZKML_VERIFIER_DEPLOYMENT=${baseOutPath}`);
  console.log('  export EXPLORER_BASE_URL=https://sepolia.basescan.org');
}

main().catch((e) => { console.error(e); process.exit(1); });

