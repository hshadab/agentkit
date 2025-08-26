const ethers = require('ethers');

async function checkBalance() {
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const address = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
    
    const balance = await provider.getBalance(address);
    console.log('🔍 Ethereum Sepolia Balance Check');
    console.log('=' .repeat(50));
    console.log('Address:', address);
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
    console.log('Balance (Wei):', balance.toString());
    
    // Estimate deployment cost
    const gasPrice = await provider.getGasPrice();
    const estimatedGas = 3000000; // Estimated for contract deployment
    const deploymentCost = gasPrice.mul(estimatedGas);
    
    console.log('\n💰 Deployment Requirements:');
    console.log('Estimated Gas:', estimatedGas);
    console.log('Gas Price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'Gwei');
    console.log('Estimated Cost:', ethers.utils.formatEther(deploymentCost), 'ETH');
    
    if (balance.lt(deploymentCost)) {
        const needed = ethers.utils.formatEther(deploymentCost.sub(balance));
        console.log('\n❌ Insufficient funds!');
        console.log('Need additional:', needed, 'ETH');
        console.log('\n🚰 Get Sepolia ETH from:');
        console.log('1. https://sepoliafaucet.com');
        console.log('2. https://faucet.quicknode.com/ethereum/sepolia');
        console.log('3. https://www.alchemy.com/faucets/ethereum-sepolia');
        console.log('4. https://sepolia-faucet.pk910.de (PoW faucet)');
    } else {
        console.log('\n✅ Sufficient funds for deployment!');
    }
}

checkBalance().catch(console.error);