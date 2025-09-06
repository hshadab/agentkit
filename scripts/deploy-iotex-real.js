const { ethers } = require('ethers');
const fs = require('fs');
const solc = require('solc');

// IoTeX testnet configuration
const IOTEX_RPC = "https://babel-api.testnet.iotex.io";
const PRIVATE_KEY = "0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab";

async function compileContract(contractPath, dependencies = {}) {
    console.log(`Compiling ${contractPath}...`);
    const source = fs.readFileSync(contractPath, 'utf8');
    
    // Build sources object with dependencies
    const sources = {
        'contract.sol': {
            content: source
        }
    };
    
    // Add dependencies
    for (const [name, path] of Object.entries(dependencies)) {
        sources[name] = {
            content: fs.readFileSync(path, 'utf8')
        };
    }
    
    const input = {
        language: 'Solidity',
        sources: sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            if (err.severity === 'error') {
                throw new Error(`Compilation error: ${err.formattedMessage}`);
            }
        });
    }

    const contractName = Object.keys(output.contracts['contract.sol'])[0];
    const contract = output.contracts['contract.sol'][contractName];
    
    return {
        abi: contract.abi,
        bytecode: '0x' + contract.evm.bytecode.object
    };
}

async function deployContract(provider, wallet, bytecode, abi, constructorArgs = []) {
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    console.log("Deploying contract...");
    
    // Get current gas price and multiply by 1.5 for priority
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || ethers.parseUnits('100', 'gwei');
    const gasPrice = (currentGasPrice * 3n) / 2n;  // 1.5x current gas price
    
    console.log(`Current gas price: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei`);
    console.log(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    const contract = await factory.deploy(...constructorArgs, {
        gasLimit: 5000000,
        gasPrice: gasPrice
    });
    
    console.log("Waiting for deployment...");
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`Contract deployed at: ${address}`);
    
    return contract;
}

async function main() {
    try {
        console.log("=== Deploying IoTeX Proximity Contracts ===\n");
        
        // Connect to IoTeX testnet with static network to avoid detection issues
        const provider = new ethers.JsonRpcProvider(IOTEX_RPC, {
            chainId: 4690,
            name: 'iotex-testnet'
        });
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log("Wallet address:", wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log("Balance:", ethers.formatEther(balance), "IOTX\n");
        
        // We'll use the already deployed verifier from the previous run
        // Or deploy a new one if needed
        const verifierAddress = "0x5A2d6Df32833E43A8432ab99D0361D596c1958Ca"; // Latest deployed verifier
        console.log("1. Using already deployed ProximityGroth16Verifier:", verifierAddress);
        
        // Compile and deploy IoTeXProximitySystem
        console.log("\n2. Deploying IoTeXProximitySystem...");
        const systemCompiled = await compileContract('contracts/IoTeXProximitySystemDeployable.sol');
        const systemContract = await deployContract(
            provider,
            wallet,
            systemCompiled.bytecode,
            systemCompiled.abi,
            [verifierAddress] // Pass verifier address to constructor as array
        );
        const systemAddress = await systemContract.getAddress();
        
        console.log("\n=== Deployment Complete ===");
        console.log("ProximityGroth16Verifier:", verifierAddress);
        console.log("IoTeXProximitySystem:", systemAddress);
        
        // Save addresses to file
        const deploymentInfo = {
            network: "iotex-testnet",
            verifier: verifierAddress,
            system: systemAddress,
            deployer: wallet.address,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
            'iotex-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\nDeployment info saved to iotex-deployment.json");
        console.log("\nNext steps:");
        console.log(`1. Update api/iotex-proximity-zkengine-real.js with:`);
        console.log(`   VERIFIER_ADDRESS = "${verifierAddress}"`);
        console.log(`   SYSTEM_ADDRESS = "${systemAddress}"`);
        
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main();