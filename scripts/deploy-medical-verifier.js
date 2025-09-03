const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Avalanche Fuji configuration
const AVALANCHE_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';

async function deploy() {
    console.log('🚀 Deploying Medical Groth16 Verifier to Avalanche Fuji...\n');
    
    // Connect to Avalanche
    const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Deployer:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'AVAX\n');
    
    // Read the compiled contract
    const contractPath = path.join(__dirname, '../contracts/MedicalGroth16Verifier.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    // For simplicity, we'll use the pre-compiled bytecode
    // In production, you'd compile the contract first
    console.log('Contract loaded from:', contractPath);
    
    // Compile the contract using solc
    const solc = require('solc');
    
    const input = {
        language: 'Solidity',
        sources: {
            'MedicalGroth16Verifier.sol': {
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
    
    console.log('Compiling contract...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors && output.errors.some(e => e.severity === 'error')) {
        console.error('Compilation errors:', output.errors);
        process.exit(1);
    }
    
    const contractName = Object.keys(output.contracts['MedicalGroth16Verifier.sol'])[0];
    const contract = output.contracts['MedicalGroth16Verifier.sol'][contractName];
    
    const bytecode = contract.evm.bytecode.object;
    const abi = contract.abi;
    
    console.log('Contract compiled successfully!');
    console.log('Bytecode size:', bytecode.length / 2, 'bytes\n');
    
    // Deploy the contract
    console.log('Deploying contract...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const verifier = await factory.deploy();
    
    console.log('Transaction hash:', verifier.deploymentTransaction().hash);
    console.log('Waiting for confirmation...');
    
    await verifier.waitForDeployment();
    const address = await verifier.getAddress();
    
    console.log('\n✅ Medical Groth16 Verifier deployed!');
    console.log('Contract address:', address);
    console.log('Explorer:', `https://testnet.snowtrace.io/address/${address}`);
    
    // Save deployment info
    const deployment = {
        address,
        network: 'avalanche-fuji',
        deployedAt: new Date().toISOString(),
        deployer: wallet.address,
        abi
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/medical-groth16-verifier.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log('\nDeployment saved to:', deploymentPath);
    
    console.log('\n📝 Next steps:');
    console.log(`1. Update VERIFIER_ADDRESS in api/avalanche-medical-groth16.js to: ${address}`);
    console.log('2. Restart the backend');
    console.log('3. Test the complete flow with real Groth16 verification!');
    
    return address;
}

deploy().catch(console.error);