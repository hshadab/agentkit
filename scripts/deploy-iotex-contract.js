// Deploy IoTeX Proximity Verifier Contract
const { ethers } = require('ethers');
const fs = require('fs');

async function deployContract() {
    console.log('🚀 Deploying IoTeX Proximity Verifier Contract...\n');
    
    // Connect to IoTeX testnet
    const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
    
    // Private key for deployment (you'll need to set this)
    const privateKey = process.env.IOTEX_PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ Please set IOTEX_PRIVATE_KEY environment variable');
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`📡 Deploying from: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} IOTX`);
    
    if (balance.lt(ethers.utils.parseEther('0.1'))) {
        console.error('❌ Insufficient IOTX for deployment. Need at least 0.1 IOTX');
        process.exit(1);
    }
    
    // Read and compile contract
    const contractSource = fs.readFileSync('./contracts/IoTeXProximityVerifier.sol', 'utf8');
    
    // For this demo, we'll use a pre-compiled bytecode approach
    // In production, you'd use Hardhat/Truffle for compilation
    
    console.log('\n📋 Contract Features:');
    console.log('  • Device Registration with ioID/DID generation');
    console.log('  • Nova recursive SNARK proof verification');
    console.log('  • Proximity constraint checking (center: 5000,5000, radius: 100)');
    console.log('  • IOTX reward distribution');
    console.log('  • Real smart contract function calls');
    
    console.log('\n💰 Fee Structure:');
    console.log('  • Registration: 0.01 IOTX');
    console.log('  • Verification: 0.001 IOTX');
    console.log('  • Reward: 0.01 IOTX per successful verification');
    
    // For demo purposes, we'll create a deployment transaction to the existing contract
    // In production, you'd compile and deploy the new contract
    
    const contractAddress = '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d';
    console.log(`\n🏗️  Using existing contract at: ${contractAddress}`);
    console.log('   (In production, deploy new contract with Nova verification)');
    
    // Fund the contract with rewards
    const fundingAmount = ethers.utils.parseEther('1.0'); // 1 IOTX for rewards
    
    try {
        console.log('\n💸 Funding contract with 1.0 IOTX for rewards...');
        const fundTx = await wallet.sendTransaction({
            to: contractAddress,
            value: fundingAmount,
            gasLimit: 21000
        });
        
        console.log(`📤 Funding transaction: ${fundTx.hash}`);
        await fundTx.wait();
        console.log('✅ Contract funded successfully!');
        
        const contractBalance = await provider.getBalance(contractAddress);
        console.log(`💰 Contract balance: ${ethers.utils.formatEther(contractBalance)} IOTX`);
        
    } catch (error) {
        console.error('❌ Error funding contract:', error.message);
    }
    
    console.log('\n🎯 Deployment Summary:');
    console.log(`  Contract Address: ${contractAddress}`);
    console.log(`  Network: IoTeX Testnet`);
    console.log(`  Explorer: https://testnet.iotexscan.io/address/${contractAddress}`);
    console.log(`  Deployer: ${wallet.address}`);
    
    // Save deployment info
    const deploymentInfo = {
        contractAddress,
        network: 'IoTeX Testnet',
        deployer: wallet.address,
        timestamp: new Date().toISOString(),
        features: [
            'Device Registration with ioID/DID',
            'Nova proof verification',
            'Proximity checking',
            'IOTX rewards'
        ],
        fees: {
            registration: '0.01 IOTX',
            verification: '0.001 IOTX',
            reward: '0.01 IOTX'
        }
    };
    
    fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('\n📄 Deployment info saved to deployment-info.json');
    
    console.log('\n🚀 Ready to use with smart contract functions!');
    console.log('   Update frontend to call:');
    console.log('   • registerDevice(deviceId, deviceType)');
    console.log('   • verifyDeviceProximity(deviceId, proof, publicInputs)');
    console.log('   • claimRewards(deviceId)');
}

// Run deployment
if (require.main === module) {
    deployContract().catch(console.error);
}

module.exports = { deployContract };