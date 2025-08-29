const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployRealVerifier() {
    console.log('🚀 Deploying REAL zkML verifier with submitProof to Sepolia...\n');
    
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
    
    // Read compiled contract from solc output
    const abiPath = path.join(__dirname, 'build/contracts_RealZKMLNovaVerifier_sol_RealZKMLNovaVerifier.abi');
    const binPath = path.join(__dirname, 'build/contracts_RealZKMLNovaVerifier_sol_RealZKMLNovaVerifier.bin');
    
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const bytecode = '0x' + fs.readFileSync(binPath, 'utf8').trim();
    
    console.log('Contract bytecode size:', bytecode.length / 2, 'bytes');
    console.log('Functions in ABI:', abi.filter(x => x.type === 'function').map(x => x.name).join(', '));
    
    // Deploy contract
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    console.log('\nDeploying contract...');
    const contract = await factory.deploy({
        gasLimit: 3000000,
        gasPrice: (await provider.getGasPrice()).mul(2) // 2x gas price for faster confirmation
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
        abi: abi,
        functions: abi.filter(x => x.type === 'function').map(x => x.name)
    };
    
    const deploymentPath = path.join(__dirname, 'deployments/sepolia-real-verifier.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\nDeployment info saved to:', deploymentPath);
    
    // Test the submitProof function
    console.log('\n📝 Testing submitProof function...');
    const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-proof-' + Date.now()));
    const publicSignals = [12345, 1, 95, 1]; // [prompt_hash, decision, confidence, amount_valid]
    
    try {
        const tx = await contract.submitProof(proofHash, publicSignals, {
            gasLimit: 200000
        });
        console.log('Test transaction:', tx.hash);
        const receipt = await tx.wait();
        console.log('✅ submitProof function works!');
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Check for events
        const event = receipt.events?.find(e => e.event === 'ZKMLProofVerified');
        if (event) {
            console.log('\nEvent emitted: ZKMLProofVerified');
            console.log('  Proof ID:', event.args.proofId);
            console.log('  Authorized:', event.args.authorized);
            console.log('  Decision:', event.args.decision.toString());
        }
    } catch (error) {
        console.log('⚠️  Test error:', error.message);
    }
    
    return contract.address;
}

deployRealVerifier()
    .then(address => {
        console.log('\n🎉 REAL verifier deployed at:', address);
        console.log('Update the backend to use this address!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });