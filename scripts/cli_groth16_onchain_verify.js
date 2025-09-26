#!/usr/bin/env node
// CLI to submit Groth16 verification TX on-chain using ethers
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const inputStr = (await readStdin()) || '{}';
  const payload = JSON.parse(inputStr);
  const { proof, publicSignals } = payload;
  if (!proof || !publicSignals) throw new Error('Missing proof or publicSignals in input');

  // Allow overriding deployment to target different networks (e.g., Base Sepolia)
  const deploymentPath = process.env.ZKML_VERIFIER_DEPLOYMENT
    || path.join(__dirname, '..', 'deployments', 'jolt-storage-verifier-sepolia.json');
  const deployment = JSON.parse(
    fs.readFileSync(deploymentPath, 'utf8')
  );

  const rpc = process.env.ETH_RPC || process.env.BASE_RPC_URL || 'https://sepolia.base.org';
  const chainId = Number(process.env.CHAIN_ID || process.env.ETH_CHAIN_ID || 84532);
  const networkName = process.env.NETWORK_NAME || 'base-sepolia';
  const provider = new ethers.JsonRpcProvider(rpc, { chainId, name: networkName });

  const pk = process.env.GROTH16_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing GROTH16_PRIVATE_KEY/PRIVATE_KEY');

  const wallet = new ethers.Wallet(pk, provider);
  const verifierAddress = process.env.ZKML_VERIFIER_ADDRESS || deployment.address;
  const contract = new ethers.Contract(verifierAddress, deployment.abi, wallet);

  // Format inputs
  const a = [proof.a[0], proof.a[1]];
  const b = [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]];
  const c = [proof.c[0], proof.c[1]];
  const signals = publicSignals.length === 5 ? publicSignals : publicSignals.slice(0, 5);
  const storeSignals = [signals[0], signals[2]]; // decision, confidence

  const fee = await provider.getFeeData();
  const tx = await contract.verifyAndStore(a, b, c, storeSignals, {
    gasLimit: 500000,
    gasPrice: fee.gasPrice ? fee.gasPrice * 2n : undefined,
  });
  const receipt = await tx.wait();

  process.stdout.write(JSON.stringify({
    success: true,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    etherscanUrl: `${process.env.EXPLORER_BASE_URL || 'https://sepolia.basescan.org'}/tx/${tx.hash}`,
    contractAddress: verifierAddress,
    contractUrl: `${process.env.EXPLORER_BASE_URL || 'https://sepolia.basescan.org'}/address/${verifierAddress}`,
  }));
}

main().catch((e) => {
  process.stderr.write(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
