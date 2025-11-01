const { ethers } = require('ethers');

const privateKey = process.env.TEST_PRIVATE_KEY || "0xYOUR_TEST_PRIVATE_KEY";
const wallet = new ethers.Wallet(privateKey);

console.log(`\nPrivate Key: ${privateKey}`);
console.log(`Corresponds to: ${wallet.address}`);
console.log(`\nYour wallet: 0x2e408ad62e30146404F4ED8A61253212f3f9A490`);
console.log(`Match: ${wallet.address.toLowerCase() === '0x2e408ad62e30146404F4ED8A61253212f3f9A490'.toLowerCase() ? 'YES ✅' : 'NO ❌'}`);
