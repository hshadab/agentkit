const { ethers } = require('ethers');

async function transferAll() {
    // Using Ankr public RPC
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia');
    const wallet = new ethers.Wallet('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab', provider);
    
    const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    
    const abi = ['function balanceOf(address) view returns (uint256)', 'function transfer(address, uint256) returns (bool)'];
    const usdc = new ethers.Contract(USDC, abi, wallet);
    
    const balance = await usdc.balanceOf(wallet.address);
    console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6));
    
    if (!balance.isZero()) {
        console.log('Transferring to Gateway...');
        const tx = await usdc.transfer(GATEWAY, balance);
        console.log('TX:', tx.hash);
        await tx.wait();
        console.log('Done!');
    } else {
        console.log('No USDC to transfer');
    }
}

transferAll().catch(console.error);
