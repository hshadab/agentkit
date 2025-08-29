const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

// Address of the already deployed Groth16 verifier
const GROTH16_VERIFIER = '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308';

async function deployVerifierWithStorage() {
    console.log('🚀 Deploying JOLT Decision Verifier with Storage to Sepolia...\n');
    console.log('This version WILL cost gas for verification but provides:');
    console.log('  ✓ Permanent on-chain record of verification');
    console.log('  ✓ Event emission for proof');
    console.log('  ✓ Prevention of double-verification');
    console.log('  ✓ Verifier reputation tracking\n');

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
    const contractPath = path.join(__dirname, '../contracts/JOLTDecisionVerifierWithStorage.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    // Compile contract
    console.log('📝 Compiling contract...');
    const solc = require('solc');
    
    const input = {
        language: 'Solidity',
        sources: {
            'JOLTDecisionVerifierWithStorage.sol': {
                content: contractSource
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors && output.errors.some(e => e.severity === 'error')) {
        console.error('❌ Compilation errors:', output.errors);
        process.exit(1);
    }
    
    const contract = output.contracts['JOLTDecisionVerifierWithStorage.sol']['JOLTDecisionVerifierWithStorage'];
    const bytecode = '0x' + contract.evm.bytecode.object;
    const abi = contract.abi;
    
    console.log('✅ Contract compiled successfully');
    console.log('📏 Bytecode size:', bytecode.length / 2 - 1, 'bytes\n');
    
    // Deploy contract with constructor argument
    console.log('🔨 Deploying contract...');
    console.log('   Using Groth16 verifier at:', GROTH16_VERIFIER);
    
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    const deployTx = await factory.deploy(GROTH16_VERIFIER);
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
        groth16Verifier: GROTH16_VERIFIER,
        deployer: wallet.address,
        timestamp: new Date().toISOString(),
        abi: abi,
        type: 'storage',
        gasless: false,
        note: 'This version stores verification results on-chain and costs gas'
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/jolt-storage-verifier-sepolia.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n📁 Deployment info saved to:', deploymentPath);
    
    // Estimate gas for verification
    console.log('\n⛽ Estimating gas costs...');
    
    const verifier = new ethers.Contract(address, abi, wallet);
    
    // Load a test proof
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
        const gasEstimate = await verifier.verifyAndStore.estimateGas(a, b, c, publicSignals);
        const feeData = await provider.getFeeData();
        const estimatedCost = gasEstimate * feeData.gasPrice;
        
        console.log('   Estimated gas for verifyAndStore:', gasEstimate.toString());
        console.log('   Estimated cost:', ethers.formatEther(estimatedCost), 'ETH');
        console.log('   At current gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
        
    } catch (error) {
        console.log('   Could not estimate gas (proof may be invalid for this verifier)');
    }
    
    console.log('\n📊 Comparison:');
    console.log('   View function (current): FREE but no on-chain record');
    console.log('   State-changing (this): ~100-150k gas but permanent record');
    
    console.log('\n🎉 Deployment complete!');
    console.log('\nNext steps:');
    console.log('1. Update backend to use verifyAndStore for permanent records');
    console.log('2. Or keep both: view function for checking, state function for recording');
    
    return address;
}

deployVerifierWithStorage().catch(console.error);