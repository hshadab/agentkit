#!/usr/bin/env node
/**
 * Deposit USDC (Sepolia) into Circle Gateway wallet
 *
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   node scripts/deposit-to-gateway.js --amount 8.0 
 *
 * Notes:
 * - Connects to Ethereum Sepolia
 * - Approves GatewayWallet to spend USDC, then calls deposit(token, amount)
 * - Verifies Gateway balance via local proxy (port 8006) if available
 */

const { ethers } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Config (from repo constants used elsewhere)
const RPC = process.env.SEPOLIA_RPC || 'https://eth-sepolia.public.blastapi.io';
const USDC_SEPOLIA = process.env.USDC_SEPOLIA || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const GATEWAY_WALLET = process.env.GATEWAY_WALLET || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const DEPOSITOR = process.env.DEPOSITOR || '0xE616B2eC620621797030E0AB1BA38DA68D78351C';

// Minimal ABIs
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];
// Assuming GatewayWallet has: function deposit(address token, uint256 amount)
const GATEWAY_ABI = [
  'function deposit(address,uint256)'
];

async function main() {
  const args = require('minimist')(process.argv.slice(2));
  const pk = process.env.PRIVATE_KEY || args.pk;
  if (!pk) throw new Error('Missing PRIVATE_KEY env or --pk');

  const amountStr = args.amount || args.a;
  if (!amountStr) throw new Error('Missing --amount (e.g., 8.0)');
  const amount = parseFloat(amountStr);
  if (!isFinite(amount) || amount <= 0) throw new Error('Invalid --amount');

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);

  console.log(`Depositing ${amount} USDC from ${wallet.address} to Gateway wallet ${GATEWAY_WALLET}`);

  const usdc = new ethers.Contract(USDC_SEPOLIA, ERC20_ABI, wallet);
  const gw = new ethers.Contract(GATEWAY_WALLET, GATEWAY_ABI, wallet);

  const decimalsRaw = await usdc.decimals();
  const decimals = Number(decimalsRaw);
  const units = ethers.parseUnits(amount.toFixed(decimals), decimals);

  // Check EOA USDC balance
  const bal = await usdc.balanceOf(wallet.address);
  console.log(`USDC balance: ${ethers.formatUnits(bal, decimals)} (need >= ${amount.toFixed(decimals)})`);
  if (bal < units) throw new Error('Insufficient USDC balance in EOA');

  // Approve if needed
  const currentAllowance = await usdc.allowance(wallet.address, GATEWAY_WALLET);
  if (currentAllowance < units) {
    console.log(`Approving ${amount} USDC to Gateway wallet...`);
    const tx = await usdc.approve(GATEWAY_WALLET, units);
    console.log('Approve tx:', tx.hash);
    await tx.wait();
    console.log('Approve confirmed');
  } else {
    console.log('Sufficient allowance already set.');
  }

  // Deposit
  console.log('Calling deposit(token, amount)...');
  const depTx = await gw.deposit(USDC_SEPOLIA, units);
  console.log('Deposit tx:', depTx.hash);
  const receipt = await depTx.wait();
  console.log('Deposit confirmed in block', receipt.blockNumber);

  // Optional: verify via local proxy
  try {
    const resp = await fetch('http://localhost:8006/gateway/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: DEPOSITOR })
    });
    const data = await resp.json();
    if (data.success) {
      console.log('Gateway balance (total):', data.totalBalance, 'USDC');
    } else {
      console.log('Balance check failed:', data);
    }
  } catch (e) {
    console.log('Skipping balance verification (proxy not running?):', e.message);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

