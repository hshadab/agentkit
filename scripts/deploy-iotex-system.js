const { ethers } = require('ethers');
const fs = require('fs');
const solc = require('solc');

// IoTeX testnet configuration
const IOTEX_RPC = "https://babel-api.testnet.iotex.io";
const PRIVATE_KEY = "0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab";
const VERIFIER_ADDRESS = "0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A"; // 6-signal verifier

async function main() {
    try {
        console.log("=== Deploying IoTeX Proximity System ===\n");
        
        // Connect to IoTeX testnet
        const provider = new ethers.JsonRpcProvider(IOTEX_RPC, {
            chainId: 4690,
            name: 'iotex-testnet'
        });
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log("Wallet address:", wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log("Balance:", ethers.formatEther(balance), "IOTX");
        console.log("Using Verifier:", VERIFIER_ADDRESS, "\n");
        
        // Compile IoTeXProximitySystemDeployable
        console.log("Compiling IoTeXProximitySystemDeployable.sol...");
        const source = fs.readFileSync('contracts/IoTeXProximitySystemDeployable.sol', 'utf8');
        
        const input = {
            language: 'Solidity',
            sources: {
                'IoTeXProximitySystemDeployable.sol': {
                    content: source
                }
            },
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

        const contract = output.contracts['IoTeXProximitySystemDeployable.sol']['IoTeXProximitySystem'];
        const bytecode = '0x' + contract.evm.bytecode.object;
        const abi = contract.abi;
        
        // Deploy the contract
        console.log("Deploying IoTeXProximitySystem...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        
        // Get current gas price
        const feeData = await provider.getFeeData();
        const gasPrice = (feeData.gasPrice || ethers.parseUnits('1000', 'gwei')) * 3n / 2n;
        console.log("Gas price:", ethers.formatUnits(gasPrice, 'gwei'), "gwei");
        
        const deployedContract = await factory.deploy(VERIFIER_ADDRESS, {
            gasLimit: 5000000,
            gasPrice: gasPrice
        });
        
        console.log("Waiting for deployment...");
        await deployedContract.waitForDeployment();
        
        const systemAddress = await deployedContract.getAddress();
        console.log("✅ IoTeXProximitySystem deployed at:", systemAddress);
        
        // Save deployment info
        const deploymentInfo = {
            network: "iotex-testnet",
            verifier: VERIFIER_ADDRESS,
            system: systemAddress,
            deployer: wallet.address,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
            'iotex-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\n=== Deployment Complete ===");
        console.log("Deployment info saved to iotex-deployment.json");
        console.log("\nNext steps:");
        console.log(`1. Update api/iotex-proximity-zkengine-real.js with:`);
        console.log(`   VERIFIER_ADDRESS = "${VERIFIER_ADDRESS}"`);
        console.log(`   SYSTEM_ADDRESS = "${systemAddress}"`);
        console.log(`\n2. Explorer: https://testnet.iotexscan.io/address/${systemAddress}`);
        
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main();
