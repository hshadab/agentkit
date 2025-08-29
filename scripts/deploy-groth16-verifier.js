const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployGroth16Verifier() {
    console.log('🚀 Deploying Groth16 Proof-of-Proof Verifier to Sepolia...\n');
    
    // Connect to Sepolia (ethers v6 syntax)
    const provider = new ethers.JsonRpcProvider(
        'https://ethereum-sepolia-rpc.publicnode.com',
        11155111
    );
    
    // Use the wallet with funds
    const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('Deployer address:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH\n');
    
    // Compile the Groth16 verifier contract
    console.log('Compiling Groth16 verifier...');
    const { execSync } = require('child_process');
    execSync('npx solc --optimize --bin --abi contracts/ZKMLProofVerifier.sol -o build/compiled/', { stdio: 'inherit' });
    
    // Read compiled contract
    const abiPath = path.join(__dirname, '../build/compiled/contracts_ZKMLProofVerifier_sol_Groth16Verifier.abi');
    const binPath = path.join(__dirname, '../build/compiled/contracts_ZKMLProofVerifier_sol_Groth16Verifier.bin');
    
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const bytecode = '0x' + fs.readFileSync(binPath, 'utf8').trim();
    
    console.log('Contract bytecode size:', bytecode.length / 2, 'bytes');
    console.log('Functions:', abi.filter(x => x.type === 'function').map(x => x.name).join(', '));
    
    // Deploy contract
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    console.log('\nDeploying contract...');
    const gasPrice = await provider.getFeeData();
    const contract = await factory.deploy({
        gasLimit: 3000000n,
        gasPrice: gasPrice.gasPrice * 2n
    });
    
    console.log('Transaction hash:', contract.deploymentTransaction().hash);
    console.log('Waiting for confirmation...\n');
    
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('✅ Groth16 verifier deployed!');
    console.log('Contract address:', contractAddress);
    console.log('Etherscan:', `https://sepolia.etherscan.io/address/${contractAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
        address: contractAddress,
        transactionHash: contract.deploymentTransaction().hash,
        deployer: wallet.address,
        network: 'sepolia',
        timestamp: new Date().toISOString(),
        abi: abi,
        type: 'Groth16 Proof-of-Proof Verifier'
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/groth16-verifier.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\nDeployment info saved to:', deploymentPath);
    
    // Test verification with a sample proof
    console.log('\n📝 Testing verifyProof function...');
    
    // Generate a test proof
    const { proof, publicSignals } = await generateTestProof();
    
    try {
        const result = await contract.verifyProof(
            proof.pi_a.slice(0, 2),
            [proof.pi_b[0].reverse(), proof.pi_b[1].reverse()],
            proof.pi_c.slice(0, 2),
            publicSignals,
            { gasLimit: 500000 }
        );
        
        console.log('✅ Verification result:', result);
    } catch (error) {
        console.log('⚠️  Test verification failed:', error.message);
    }
    
    return contractAddress;
}

async function generateTestProof() {
    // For testing, return a dummy proof structure
    return {
        proof: {
            pi_a: ['1', '2', '1'],
            pi_b: [['1', '2'], ['1', '0']],
            pi_c: ['1', '1', '1'],
            protocol: 'groth16'
        },
        publicSignals: ['12345', '1', '95', '1'] // [proofHash, decision, confidence, amountValid]
    };
}

deployGroth16Verifier()
    .then(address => {
        console.log('\n🎉 Groth16 verifier deployed at:', address);
        process.exit(0);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });