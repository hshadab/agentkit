const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

async function deploySimpleVerifier() {
    console.log('🚀 Deploying Simple JOLT Decision Verifier to Sepolia...\n');

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('📍 Deployer address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');
    
    if (balance === 0n) {
        console.error('❌ No ETH balance!');
        process.exit(1);
    }

    // Read contract source
    const contractPath = path.join(__dirname, '../circuits/jolt-verifier/JOLTDecisionSimpleVerifier.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    // Compile contract
    console.log('📝 Compiling contract...');
    const solc = require('solc');
    
    const input = {
        language: 'Solidity',
        sources: {
            'JOLTDecisionSimpleVerifier.sol': {
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
    
    const contract = output.contracts['JOLTDecisionSimpleVerifier.sol']['Groth16Verifier'];
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
        abi: abi,
        type: 'simple',
        publicInputs: ['decision', 'confidence']
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/jolt-simple-verifier-sepolia.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n📁 Deployment info saved to:', deploymentPath);
    
    // Test the verifier with the actual proof we generated
    console.log('\n🧪 Testing verifier with generated proof...');
    
    const verifier = new ethers.Contract(address, abi, wallet);
    
    // Load the proof we generated during setup
    const proof = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../circuits/jolt-verifier/proof_simple.json'), 'utf8'
    ));
    const publicSignals = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../circuits/jolt-verifier/public_simple.json'), 'utf8'
    ));
    
    // Format proof for Solidity
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];
    
    try {
        const isValid = await verifier.verifyProof(a, b, c, publicSignals);
        console.log('✅ Proof verification result:', isValid ? 'VALID' : 'INVALID');
        
        if (isValid) {
            console.log('\n🎉 On-chain verification working correctly!');
            console.log('   Decision:', publicSignals[0] === "1" ? 'APPROVE' : 'DENY');
            console.log('   Confidence:', publicSignals[1] + '%');
        }
    } catch (error) {
        console.log('❌ Verification failed:', error.message);
    }
    
    console.log('\n🎉 Deployment complete!');
    
    return address;
}

deploySimpleVerifier().catch(console.error);