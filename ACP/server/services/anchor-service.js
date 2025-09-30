import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

const VERIFIER_ADDRESS = process.env.ACP_VERIFIER_ADDRESS || '0x6121Fd93594C316B78e74B91B89A06d3Bb682a8F';
const DEPLOYMENT_PATH = process.env.ACP_VERIFIER_DEPLOYMENT || 'deployments/jolt-storage-verifier-base-sepolia.json';
const RPC_URL = process.env.BASE_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '84532');

function loadDeployment(p) {
  const attempts = [
    path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
    path.resolve(process.cwd(), '../../', p),
  ];
  for (const a of attempts) {
    try {
      if (fs.existsSync(a)) return JSON.parse(fs.readFileSync(a, 'utf8'));
    } catch {}
  }
  throw new Error(`Deployment file not found: ${p}`);
}

const deployment = loadDeployment(DEPLOYMENT_PATH);
const ABI = deployment.abi;

const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: 'base-sepolia', staticNetwork: true });

function getWallet() {
  const pk = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error('BASE_PRIVATE_KEY missing or invalid for Groth16 verifier');
  }
  return new ethers.Wallet(pk, provider);
}

function getVerifierContract() {
  const wallet = getWallet();
  return new ethers.Contract(VERIFIER_ADDRESS, ABI, wallet);
}

export async function verifyAndAnchor({ proof, publicSignals }) {
  const wallet = getWallet();
  const verifier = getVerifierContract();

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  let gasEstimate;
  try {
    gasEstimate = await verifier.verifyAndStore.estimateGas(a, b, c, publicSignals, { gasLimit: 500000 });
  } catch {
    gasEstimate = 400000n;
  }
  const tx = await verifier.verifyAndStore(
    a, b, c, publicSignals,
    {
      gasLimit: (gasEstimate * 120n) / 100n,
      maxFeePerGas: ethers.parseUnits('2', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
    }
  );
  const receipt = await tx.wait();
  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString?.() || '0',
    contractAddress: VERIFIER_ADDRESS,
    explorer: `https://sepolia.basescan.org/tx/${tx.hash}`,
  };
}
