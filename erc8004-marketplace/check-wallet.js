const { ethers } = require('ethers');
require('dotenv/config');

const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey);

console.log(`\n🔑 Private Key Check`);
console.log(`Address: ${wallet.address}`);
console.log(`\nUser's wallet: 0x2e408ad62e30146404F4ED8A61253212f3f9A490`);
console.log(`Treasury wallet: 0x14a4054f75455c03839da6a7084b5e6e334e8e24`);
console.log(`\nMatch: ${wallet.address.toLowerCase() === '0x2e408ad62e30146404F4ED8A61253212f3f9A490'.toLowerCase() ? '✅ User wallet' : wallet.address.toLowerCase() === '0x14a4054f75455c03839da6a7084b5e6e334e8e24'.toLowerCase() ? '⚠️ Treasury wallet (0 ETH)' : '❌ Unknown wallet'}`);
