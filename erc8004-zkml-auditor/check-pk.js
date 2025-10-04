const { ethers } = require('ethers');

const privateKey = "0xe04571b0c9adb6b75c63296fda1de67ab76e163530056c646a590a9cb07d31e5";
const wallet = new ethers.Wallet(privateKey);

console.log(`\nPrivate Key: ${privateKey}`);
console.log(`Corresponds to: ${wallet.address}`);
console.log(`\nYour wallet: 0x2e408ad62e30146404F4ED8A61253212f3f9A490`);
console.log(`Match: ${wallet.address.toLowerCase() === '0x2e408ad62e30146404F4ED8A61253212f3f9A490'.toLowerCase() ? 'YES ✅' : 'NO ❌'}`);
