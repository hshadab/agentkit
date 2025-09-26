#!/usr/bin/env node

// Deploy Groth16 JOLT decision verifier + storage wrapper to Base Sepolia
// Uses Hardhat runtime environment

const fs = require('fs');
const path = require('path');

async function main() {
  const hre = require('hardhat');
  const network = hre.network.name;
  if (network !== 'baseSepolia') {
    console.log(`[deploy] Warning: deploying on ${network}, expected baseSepolia`);
  }

  // Compile contracts from ./contracts and circuits copies
  await hre.run('compile');

  const [deployer] = await hre.ethers.getSigners();
  console.log(`[deploy] Deployer: ${deployer.address}`);
  console.log(`[deploy] Network: ${network}`);

  // 1) Deploy Groth16 verifier for JOLT decision (2 pub signals)
  const GrothFactory = await hre.ethers.getContractFactory('Groth16Verifier', {
    // If artifacts not found in ./contracts, we can dynamically compile from circuits/jolt-verifier
  });
  const groth = await GrothFactory.deploy();
  await groth.waitForDeployment();
  const grothAddr = await groth.getAddress();
  console.log(`[deploy] Groth16Verifier deployed at: ${grothAddr}`);

  // 2) Deploy storage wrapper that calls groth16.verifyAndStore
  const StorageFactory = await hre.ethers.getContractFactory('JOLTDecisionVerifierWithStorage');
  const storage = await StorageFactory.deploy(grothAddr);
  await storage.waitForDeployment();
  const storageAddr = await storage.getAddress();
  console.log(`[deploy] JOLTDecisionVerifierWithStorage deployed at: ${storageAddr}`);

  // 3) Write deployment JSON compatible with cli_groth16_onchain_verify.js
  const sepoliaDeploymentPath = path.join(__dirname, '..', 'deployments', 'jolt-storage-verifier-sepolia.json');
  const baseOutPath = path.join(__dirname, '..', 'deployments', 'jolt-storage-verifier-base-sepolia.json');
  let abi = [];
  try {
    const sepoliaJson = JSON.parse(fs.readFileSync(sepoliaDeploymentPath, 'utf8'));
    abi = sepoliaJson.abi || [];
  } catch (e) {
    console.warn('[deploy] Could not read sepolia storage verifier ABI; writing minimal info');
  }
  const out = {
    network: 'base-sepolia',
    address: storageAddr,
    groth16Verifier: grothAddr,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    abi,
    type: 'storage',
    note: 'JOLT storage verifier deployed on Base Sepolia',
  };
  fs.writeFileSync(baseOutPath, JSON.stringify(out, null, 2));
  console.log(`[deploy] Wrote ${baseOutPath}`);

  // 4) Export env hints
  console.log('\nEnv to use:');
  console.log(`  export ZKML_VERIFIER_ADDRESS=${storageAddr}`);
  console.log(`  export ZKML_VERIFIER_DEPLOYMENT=${baseOutPath}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

