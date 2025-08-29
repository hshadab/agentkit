const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployUpdatedVerifier() {
    console.log('🚀 Deploying updated zkML verifier to Sepolia...\n');
    
    // Connect to Sepolia
    const provider = new ethers.providers.StaticJsonRpcProvider(
        'https://ethereum-sepolia-rpc.publicnode.com',
        11155111
    );
    
    // Use the wallet with funds
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('Deployer address:', wallet.address);
    const balance = await wallet.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH\n');
    
    // Read compiled contract
    const contractPath = path.join(__dirname, '../artifacts/contracts/RealZKMLNovaVerifier.sol/RealZKMLNovaVerifier.json');
    
    let contractJson;
    try {
        contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    } catch (error) {
        console.log('Contract not compiled yet. Compiling...');
        const { execSync } = require('child_process');
        execSync('npx hardhat compile', { stdio: 'inherit' });
        contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    }
    
    const abi = contractJson.abi;
    const bytecode = contractJson.bytecode;
    
    console.log('Contract bytecode size:', bytecode.length / 2, 'bytes');
    
    // Deploy contract
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    console.log('Deploying contract...');
    const contract = await factory.deploy({
        gasLimit: 3000000,
        gasPrice: await provider.getGasPrice()
    });
    
    console.log('Transaction hash:', contract.deployTransaction.hash);
    console.log('Waiting for confirmation...\n');
    
    await contract.deployed();
    
    console.log('✅ Contract deployed!');
    console.log('Contract address:', contract.address);
    console.log('Etherscan:', `https://sepolia.etherscan.io/address/${contract.address}`);
    console.log('Transaction:', `https://sepolia.etherscan.io/tx/${contract.deployTransaction.hash}`);
    
    // Save deployment info
    const deploymentInfo = {
        address: contract.address,
        transactionHash: contract.deployTransaction.hash,
        deployer: wallet.address,
        network: 'sepolia',
        timestamp: new Date().toISOString(),
        abi: abi
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/sepolia-verifier-updated.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\nDeployment info saved to:', deploymentPath);
    
    // Test the submitProof function
    console.log('\n📝 Testing submitProof function...');
    const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-proof'));
    const publicSignals = [12345, 1, 95, 1]; // [prompt_hash, decision, confidence, amount_valid]
    
    try {
        const tx = await contract.submitProof(proofHash, publicSignals, {
            gasLimit: 200000
        });
        console.log('Test transaction:', tx.hash);
        const receipt = await tx.wait();
        console.log('✅ submitProof function works!');
        console.log('Gas used:', receipt.gasUsed.toString());
    } catch (error) {
        console.log('⚠️  Test failed:', error.message);
    }
    
    return contract.address;
}

deployUpdatedVerifier()
    .then(address => {
        console.log('\n🎉 Deployment complete! New verifier at:', address);
        process.exit(0);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });