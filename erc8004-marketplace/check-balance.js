const { ethers } = require('ethers');
require('dotenv/config');

async function checkBalance() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_RPC_URL || "https://sepolia.base.org"
  );
  
  const address = process.env.TREASURY_ADDRESS || "0x14a4054f75455c03839da6a7084b5e6e334e8e24";
  
  const balance = await provider.getBalance(address);
  const balanceEth = ethers.utils.formatEther(balance);
  
  console.log(`\n💰 Base Sepolia Balance`);
  console.log(`Address: ${address}`);
  console.log(`Balance: ${balanceEth} ETH`);
  
  // Calculate how many validations you can do
  const gasPerValidation = 0.0002; // ~$0.02 worth at current prices
  const validations = Math.floor(parseFloat(balanceEth) / gasPerValidation);
  
  console.log(`\nEstimated validations: ~${validations}`);
  console.log(`(at ~0.0002 ETH per validation)`);
}

checkBalance().catch(console.error);
