#!/usr/bin/env node
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
require('dotenv').config();

const RPC = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID || 43113);

async function main() {
  const baseDeplPath = path.join(__dirname, '..', 'data', 'deployment-avalanche-fuji-real.json');
  if (!fs.existsSync(baseDeplPath)) throw new Error('Missing data/deployment-avalanche-fuji-real.json');
  const baseDepl = JSON.parse(fs.readFileSync(baseDeplPath, 'utf8'));
  const groth16Addr = baseDepl.contractAddress;
  if (!groth16Addr) throw new Error('Groth16 verifier address missing');

  let pk = process.env.AVALANCHE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing AVALANCHE_PRIVATE_KEY/PRIVATE_KEY');
  if (!pk.startsWith('0x')) pk = '0x' + pk;

  console.log('Deploying AvaxGroth16VerifierWithStorage to Fuji (Web3)...');

  const web3 = new Web3(RPC);
  const chainId = await web3.eth.getChainId();
  if (Number(chainId) !== CHAIN_ID) throw new Error(`Wrong chain! Expected ${CHAIN_ID}, got ${chainId}`);

  const account = web3.eth.accounts.privateKeyToAccount(pk);
  web3.eth.accounts.wallet.add(account);
  console.log('Deployer:', account.address);
  const bal = await web3.eth.getBalance(account.address);
  console.log('Balance:', web3.utils.fromWei(bal, 'ether'), 'AVAX');

  // Compile contract
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

  const contract = new web3.eth.Contract(abi);
  const deployment = contract.deploy({ data: bytecode, arguments: [groth16Addr] });
  const gas = await deployment.estimateGas({ from: account.address });
  const gasPrice = await web3.eth.getGasPrice();
  console.log('Gas estimate:', gas, 'Gas price:', web3.utils.fromWei(gasPrice, 'gwei'), 'Gwei');

  const deployed = await deployment.send({ from: account.address, gas: String(Math.floor(Number(gas) * 1.2)), gasPrice: String(gasPrice) });
  const address = deployed.options.address;
  console.log('Deployed at:', address);
  console.log('Explorer:', `https://testnet.snowtrace.io/address/${address}`);

  const outPath = path.join(__dirname, '..', 'deployments', 'avax-groth16-storage-fuji.json');
  const info = { network: 'avalanche-fuji', address, groth16Verifier: groth16Addr, deployer: account.address, timestamp: new Date().toISOString() };
  fs.writeFileSync(outPath, JSON.stringify(info, null, 2));
  console.log('Saved:', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });

