#!/usr/bin/env node
const snarkjs = require('snarkjs');
const path = require('path');
const circomlib = require('circomlibjs');
const { Web3 } = require('web3');
const fs = require('fs');
require('dotenv').config();

async function main() {
  // Generate proof
  const wasm = path.join(__dirname, '..', 'build', 'RealProofOfProof_js', 'RealProofOfProof_js', 'RealProofOfProof.wasm');
  const zkey = path.join(__dirname, '..', 'build', 'real_proof_of_proof_final.zkey');
  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  const now = Math.floor(Date.now()/1000);
  const timestamp = Math.min(Math.max(now, 1704067201), 1893455900);
  const proofType = 2;
  const userAddr = process.env.AVALANCHE_PUBLIC_ADDRESS || '0x2e408ad62e30146404F4ED8A61253212f3f9A490';
  const userAddress = BigInt(userAddr);

  const novaProofHash = 1234567890123456789n;
  const executionStepCount = 1000n;
  const finalStateHash = 9876543210987654321n;
  const verificationSeed = (1n<<80n) + 12345n;
  const kycData = 0n;
  const locationData = 42n;
  const aiContentHash = 0n;

  const cIn = [novaProofHash, executionStepCount, finalStateHash, verificationSeed].map(x=>F.e(x));
  const novaProofCommitment = F.toObject(poseidon(cIn)).toString();
  const input = {
    novaProofCommitment, proofType: proofType.toString(), timestamp: timestamp.toString(), userAddress: userAddress.toString(),
    novaProofHash: novaProofHash.toString(), executionStepCount: executionStepCount.toString(), finalStateHash: finalStateHash.toString(), verificationSeed: verificationSeed.toString(),
    kycData: kycData.toString(), locationData: locationData.toString(), aiContentHash: aiContentHash.toString()
  };

  console.log('🔧 Generating Groth16 proof...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  console.log('✅ Proof generated. nPublic =', publicSignals.length);

  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [[proof.pi_b[0][1], proof.pi_b[0][0]],[proof.pi_b[1][1], proof.pi_b[1][0]]];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  // Send transaction via Web3
  const RPC = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID || 43113);
  let pk = process.env.AVALANCHE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing AVALANCHE_PRIVATE_KEY');
  if (!pk.startsWith('0x')) pk = '0x'+pk;

  const storagePath = path.join(__dirname, '..', 'deployments', 'avax-groth16-storage-fuji.json');
  if (!fs.existsSync(storagePath)) throw new Error('Storage deployment file missing');
  const storageAddr = JSON.parse(fs.readFileSync(storagePath, 'utf8')).address;

  const ABI = [
    {"inputs":[{"name":"a","type":"uint256[2]"},{"name":"b","type":"uint256[2][2]"},{"name":"c","type":"uint256[2]"},{"name":"input","type":"uint256[6]"}],"name":"verifyAndStore","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
  ];

  const web3 = new Web3(RPC);
  const chain = await web3.eth.getChainId();
  if (Number(chain)!==CHAIN_ID) throw new Error(`Wrong chain: ${chain}`);
  const acct = web3.eth.accounts.privateKeyToAccount(pk);
  web3.eth.accounts.wallet.add(acct);
  console.log('Deployer:', acct.address);
  console.log('Storage:', storageAddr);

  const contract = new web3.eth.Contract(ABI, storageAddr);
  const gas = await contract.methods.verifyAndStore(a,b,c,publicSignals).estimateGas({ from: acct.address });
  const gasPrice = await web3.eth.getGasPrice();
  const gasNum = Number(gas);
  const gasLimit = Math.floor(gasNum * 1.2);
  console.log('⛽ Gas estimate:', gasNum, 'limit', gasLimit, 'price', web3.utils.fromWei(gasPrice,'gwei'),'Gwei');
  console.log('⛓️  Sending tx...');
  await new Promise((resolve, reject) => {
    contract.methods.verifyAndStore(a,b,c,publicSignals)
      .send({ from: acct.address, gas: gasLimit, gasPrice })
      .once('transactionHash', (hash) => {
        console.log('🧾 Tx:', hash);
        console.log('Explorer:', 'https://testnet.snowtrace.io/tx/'+hash);
        resolve();
      })
      .once('error', (err) => reject(err));
  });
  console.log('Submitted. Waiting for inclusion on Fuji (check Snowtrace).');
}

main().catch(e=>{console.error(e); process.exit(1);});
