const { ethers } = require("ethers");
const fs = require("fs");
const solc = require("solc");

async function deployMockVerifier() {
    // Compile the contract
    const source = fs.readFileSync("contracts/MockVerifier.sol", "utf8");
    
    const input = {
        language: "Solidity",
        sources: {
            "MockVerifier.sol": {
                content: source
            }
        },
        settings: {
            outputSelection: {
                "*": {
                    "*": ["abi", "evm.bytecode"]
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        console.error("Compilation errors:", output.errors);
        return;
    }
    
    const contract = output.contracts["MockVerifier.sol"]["MockVerifier"];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;
    
    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
    const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
    
    console.log("Deploying from:", wallet.address);
    
    // Deploy
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const mockVerifier = await factory.deploy();
    
    console.log("Deploying to:", mockVerifier.target);
    await mockVerifier.waitForDeployment();
    
    console.log("MockVerifier deployed to:", await mockVerifier.getAddress());
    
    // Save ABI
    fs.writeFileSync("build/MockVerifier.json", JSON.stringify({ abi, address: await mockVerifier.getAddress() }, null, 2));
}

// Run with: node deploy-mock-verifier.js
deployMockVerifier().catch(console.error);