#!/usr/bin/env node
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'ACP/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const RPC_URL = process.env.BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Missing BASE_PRIVATE_KEY in env');
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('Deployer:', await wallet.getAddress());
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)));

  const contractPath = path.resolve(process.cwd(), 'circuits/jolt-verifier/JOLTDecisionVerifier.sol');
  const source = fs.readFileSync(contractPath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'JOLTDecisionVerifier.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['*'] } } },
  };
  console.log('Compiling...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.some((e) => e.severity === 'error')) {
    console.error(output.errors);
    process.exit(1);
  }
  const contract = output.contracts['JOLTDecisionVerifier.sol']['Groth16Verifier'];
  const bytecode = '0x' + contract.evm.bytecode.object;
  const abi = contract.abi;
  console.log('Bytecode size:', bytecode.length / 2, 'bytes');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const instance = await factory.deploy();
  console.log('Deploy tx:', instance.deploymentTransaction().hash);
  await instance.waitForDeployment();
  const address = await instance.getAddress();
  console.log('Deployed at:', address);
  console.log('Explorer:', `https://sepolia.basescan.org/address/${address}`);

  const outPath = path.resolve(process.cwd(), 'deployments/jolt-simple-verifier-base-sepolia.json');
  fs.writeFileSync(outPath, JSON.stringify({ network: 'base-sepolia', address, deployer: wallet.address, abi }, null, 2));
  console.log('Saved:', outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });

