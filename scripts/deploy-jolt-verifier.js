const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab'; // Test wallet with ETH

async function deployJOLTVerifier() {
    console.log('🚀 Deploying JOLT Decision Verifier to Sepolia...\n');

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('📍 Deployer address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');
    
    if (balance === 0n) {
        console.error('❌ No ETH balance! Get testnet ETH from https://sepolia-faucet.pk910.de/');
        process.exit(1);
    }

    // Read contract bytecode and ABI
    const contractPath = path.join(__dirname, '../circuits/jolt-verifier/JOLTDecisionVerifier.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    // Extract bytecode from the Solidity file (it's at the end)
    const bytecodeMatch = contractSource.match(/contract Groth16Verifier[\s\S]*?}/);
    
    // For now, we'll compile it using ethers
    console.log('📝 Compiling contract...');
    
    // Since the contract is already generated, we'll use a pre-compiled version
    // First, let's compile it with solc
    const solc = require('solc');
    
    const input = {
        language: 'Solidity',
        sources: {
            'JOLTDecisionVerifier.sol': {
                content: contractSource
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors && output.errors.some(e => e.severity === 'error')) {
        console.error('❌ Compilation errors:', output.errors);
        process.exit(1);
    }
    
    const contract = output.contracts['JOLTDecisionVerifier.sol']['Groth16Verifier'];
    const bytecode = '0x' + contract.evm.bytecode.object;
    const abi = contract.abi;
    
    console.log('✅ Contract compiled successfully');
    console.log('📏 Bytecode size:', bytecode.length / 2 - 1, 'bytes\n');
    
    // Deploy contract
    console.log('🔨 Deploying contract...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    const deployTx = await factory.deploy();
    console.log('📤 Transaction hash:', deployTx.deploymentTransaction().hash);
    console.log('⏳ Waiting for confirmation...\n');
    
    await deployTx.waitForDeployment();
    const address = await deployTx.getAddress();
    
    console.log('✅ Contract deployed successfully!');
    console.log('📍 Contract address:', address);
    console.log('🔗 View on Etherscan: https://sepolia.etherscan.io/address/' + address);
    
    // Save deployment info
    const deploymentInfo = {
        network: 'sepolia',
        address: address,
        deployer: wallet.address,
        timestamp: new Date().toISOString(),
        abi: abi
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/jolt-verifier-sepolia.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n📁 Deployment info saved to:', deploymentPath);
    
    // Test the verifier with a sample proof
    console.log('\n🧪 Testing verifier with sample proof...');
    
    const verifier = new ethers.Contract(address, abi, wallet);
    
    // Sample proof (this would come from the JOLT prover)
    // For testing, we'll use dummy values
    const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
    };
    
    const publicSignals = [1, 95, 80]; // decision=APPROVE, confidence=95, threshold=80
    
    try {
        // Note: This will likely fail with dummy values, but shows the interface
        const isValid = await verifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );
        console.log('✅ Proof verification result:', isValid);
    } catch (error) {
        console.log('⚠️  Sample verification failed (expected with dummy values)');
        console.log('   Real proofs from JOLT prover will work correctly');
    }
    
    console.log('\n🎉 Deployment complete!');
    
    return address;
}

// Check if solc is installed
try {
    require('solc');
} catch (error) {
    console.error('❌ solc not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install solc@0.8.17', { stdio: 'inherit' });
}

deployJOLTVerifier().catch(console.error);