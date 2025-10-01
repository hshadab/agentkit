#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');
// Load .env from both repository root and parent (aligned with server behavior)
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}
try { require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); } catch {}

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL || process.env.ETH_RPC || 'https://base-sepolia-rpc.publicnode.com';
  const chainId = Number(process.env.CHAIN_ID || 84532);
  const pk = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error('Missing BASE_PRIVATE_KEY for deployment');
  }
  const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId, name: 'base-sepolia' });
  const wallet = new ethers.Wallet(pk, provider);

  const buildDir = path.join(__dirname, '..', 'circuits', 'option-b', 'build');
  const solPath = path.join(buildDir, 'OptionBVerifier.sol');
  const storagePath = path.join(buildDir, 'OptionBStorageVerifier.sol');
  if (!fs.existsSync(solPath)) throw new Error('OptionBVerifier.sol not found. Run the build script first.');
  if (!fs.existsSync(storagePath)) throw new Error('OptionBStorageVerifier.sol not found.');
  const source = fs.readFileSync(solPath, 'utf8');
  const storageSource = fs.readFileSync(storagePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'OptionBVerifier.sol': { content: source },
      'OptionBStorageVerifier.sol': { content: storageSource },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors && output.errors.length) {
    const fatal = output.errors.find(e => e.severity === 'error');
    if (fatal) throw new Error('Solidity compile error: ' + fatal.formattedMessage);
    console.warn('Solidity warnings:\n' + output.errors.map(e => e.formattedMessage).join('\n'));
  }
  const verifierContracts = output.contracts['OptionBVerifier.sol'];
  const verifierName = Object.keys(verifierContracts)[0]; // Groth16Verifier
  const verifierArtifact = verifierContracts[verifierName];
  const verifierAbi = verifierArtifact.abi;
  const verifierBytecode = verifierArtifact.evm.bytecode.object;
  if (!verifierBytecode || verifierBytecode.length < 10) throw new Error('No bytecode produced for verifier');

  console.log(`[deploy] Deployer: ${await wallet.getAddress()}`);
  // Deploy verifier first
  const VerifierFactory = new ethers.ContractFactory(verifierAbi, '0x' + verifierBytecode, wallet);
  const verifier = await VerifierFactory.deploy();
  console.log('[deploy] Verifier tx:', verifier.deploymentTransaction().hash);
  const vDeployed = await verifier.waitForDeployment();
  const verifierAddress = await vDeployed.getAddress();
  console.log('[deploy] Verifier at:', verifierAddress);

  // Compile storage wrapper
  const storageContracts = output.contracts['OptionBStorageVerifier.sol'];
  const storageName = Object.keys(storageContracts)[0]; // Groth16StorageVerifier
  const storageArtifact = storageContracts[storageName];
  const storageAbi = storageArtifact.abi;
  const storageBytecode = storageArtifact.evm.bytecode.object;
  if (!storageBytecode || storageBytecode.length < 10) throw new Error('No bytecode produced for storage verifier');

  // Deploy storage wrapper with verifier address
  const StorageFactory = new ethers.ContractFactory(storageAbi, '0x' + storageBytecode, wallet);
  const storage = await StorageFactory.deploy(verifierAddress);
  console.log('[deploy] StorageVerifier tx:', storage.deploymentTransaction().hash);
  const sDeployed = await storage.waitForDeployment();
  const storageAddress = await sDeployed.getAddress();
  console.log('[deploy] StorageVerifier at:', storageAddress);

  const outPath = process.env.ZKML_VERIFIER_DEPLOYMENT || path.join(__dirname, '..', 'deployments', 'option-b-verifier-base-sepolia.json');
  fs.writeFileSync(outPath, JSON.stringify({ address: storageAddress, abi: storageAbi }, null, 2));
  console.log('[deploy] Wrote deployment artifact:', outPath);
  console.log('\nSet env:');
  console.log('  ZKML_VERIFIER_ADDRESS=' + storageAddress);
  console.log('  ZKML_VERIFIER_DEPLOYMENT=' + outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
