/**
 * Setup script for FREE validation mode
 * - Checks backend wallet USDC balance
 * - Approves registry contract to spend USDC
 * - Provides instructions if USDC needed
 */

const { ethers } = require('ethers');
require('dotenv/config');

const REGISTRY_ADDRESS = '0xF86630d38fd30dE173A7548806e1f12522dC5E27';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia
const VALIDATION_FEE = ethers.utils.parseUnits('2', 6); // 2 USDC

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function main() {
  console.log('\n🔧 Setting up FREE validation mode\n');

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_RPC_URL || 'https://sepolia.base.org'
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

  console.log(`Backend wallet: ${signer.address}`);

  // Check USDC balance
  const balance = await usdcContract.balanceOf(signer.address);
  const balanceFormatted = ethers.utils.formatUnits(balance, 6);
  console.log(`USDC balance: ${balanceFormatted} USDC`);

  if (balance.lt(VALIDATION_FEE)) {
    console.log('\n⚠️  Insufficient USDC for validation');
    console.log(`   Need at least: 2 USDC`);
    console.log(`   Current balance: ${balanceFormatted} USDC`);
    console.log('\n📝 To get test USDC on Base Sepolia:');
    console.log('   1. Get ETH from faucet: https://www.alchemy.com/faucets/base-sepolia');
    console.log('   2. Bridge USDC from Ethereum Sepolia using Circle CCTP');
    console.log('   3. Or use Circle Faucet (if available)');
    return;
  }

  // Check current allowance
  const currentAllowance = await usdcContract.allowance(signer.address, REGISTRY_ADDRESS);
  const allowanceFormatted = ethers.utils.formatUnits(currentAllowance, 6);
  console.log(`Current allowance: ${allowanceFormatted} USDC`);

  if (currentAllowance.lt(VALIDATION_FEE)) {
    console.log('\n📝 Approving registry contract to spend USDC...');

    // Approve for 10 validations (20 USDC)
    const approveAmount = VALIDATION_FEE.mul(10);
    const tx = await usdcContract.approve(REGISTRY_ADDRESS, approveAmount);
    console.log(`   TX: ${tx.hash}`);

    await tx.wait();
    console.log('   ✅ Approval complete');
    console.log(`   Approved: ${ethers.utils.formatUnits(approveAmount, 6)} USDC`);
  } else {
    console.log('   ✅ Already approved');
  }

  const validations = balance.div(VALIDATION_FEE);
  console.log(`\n✅ Ready for ${validations} FREE validations`);
  console.log('\nBackend will automatically pay USDC for user submissions.');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
