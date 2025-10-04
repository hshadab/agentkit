const { ethers } = require('ethers');

async function checkBalance() {
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
  
  const address = "0x2e408ad62e30146404F4ED8A61253212f3f9A490";
  
  const balance = await provider.getBalance(address);
  const balanceEth = ethers.utils.formatEther(balance);
  
  console.log(`\n💰 Base Sepolia Balance`);
  console.log(`Address: ${address}`);
  console.log(`Balance: ${balanceEth} ETH`);
  
  const gasPerValidation = 0.0002;
  const validations = Math.floor(parseFloat(balanceEth) / gasPerValidation);
  
  console.log(`\nEstimated validations: ~${validations}`);
  console.log(`(at ~0.0002 ETH per validation)`);
}

checkBalance().catch(console.error);
