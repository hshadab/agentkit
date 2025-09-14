#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const RPC = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID || 43113);

async function main() {
  const baseDeplPath = path.join(__dirname, '..', 'data', 'deployment-avalanche-fuji-real.json');
  if (!fs.existsSync(baseDeplPath)) throw new Error('Missing data/deployment-avalanche-fuji-real.json');
  const baseDepl = JSON.parse(fs.readFileSync(baseDeplPath, 'utf8'));
  const groth16Addr = baseDepl.contractAddress;
  if (!groth16Addr) throw new Error('Groth16 verifier address missing');

  const pk = process.env.AVALANCHE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing AVALANCHE_PRIVATE_KEY/PRIVATE_KEY');

  console.log('Deploying AvaxGroth16VerifierWithStorage to Fuji...');
  const provider = new ethers.JsonRpcProvider(RPC, { chainId: CHAIN_ID, name: 'avalanche-fuji' });
  const wallet = new ethers.Wallet(pk.startsWith('0x') ? pk : '0x' + pk, provider);
  console.log('Deployer:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'AVAX');

  // Compile
  const src = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'AvaxGroth16VerifierWithStorage.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'AvaxGroth16VerifierWithStorage.sol': { content: src } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['*'] } } }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors && out.errors.some(e => e.severity === 'error')) {
    console.error(out.errors);
    throw new Error('Compilation failed');
  }
  const c = out.contracts['AvaxGroth16VerifierWithStorage.sol']['AvaxGroth16VerifierWithStorage'];
  const abi = c.abi; const bytecode = '0x' + c.evm.bytecode.object;

  // Deploy
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployTx = await factory.deploy(groth16Addr);
  console.log('Tx:', deployTx.deploymentTransaction().hash);
  await deployTx.waitForDeployment();
  const address = await deployTx.getAddress();
  console.log('Deployed at:', address);

  const deploymentInfo = {
    network: 'avalanche-fuji',
    address,
    groth16Verifier: groth16Addr,
    deployer: wallet.address,
    timestamp: new Date().toISOString()
  };
  const outPath = path.join(__dirname, '..', 'deployments', 'avax-groth16-storage-fuji.json');
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('Saved:', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
