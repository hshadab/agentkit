const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=== Deploying Real Proof Verifier to Sepolia ===\n");
    
    // Check if we have accounts configured
    const accounts = await hre.ethers.getSigners();
    if (accounts.length === 0) {
        console.error("❌ No accounts configured!");
        console.error("Please set DEPLOYER_PRIVATE_KEY in your .env file");
        console.error("Example: DEPLOYER_PRIVATE_KEY=0x...");
        process.exit(1);
    }
    
    const deployer = accounts[0];
    console.log("Deploying with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
    
    if (balance.eq(0)) {
        console.error("❌ Account has no ETH!");
        console.error("Get Sepolia ETH from: https://sepolia-faucet.pk910.de/");
        process.exit(1);
    }
    
    try {
        // Deploy the verifier
        console.log("\nDeploying RealProofOfProofVerifier...");
        const Verifier = await hre.ethers.getContractFactory("contracts/RealProofOfProofVerifier.sol:Groth16Verifier");
        const verifier = await Verifier.deploy();
        await verifier.deployed();
        
        console.log("✅ RealProofOfProofVerifier deployed to:", verifier.address);
        
        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            chainId: 11155111,
            contracts: {
                RealProofOfProofVerifier: {
                    address: verifier.address,
                    transactionHash: verifier.deployTransaction.hash,
                    deployer: deployer.address,
                    deployedAt: new Date().toISOString()
                }
            }
        };
        
        // Update deployment file
        const deploymentPath = path.join(__dirname, "../deployment-sepolia.json");
        let existingDeployment = {};
        if (fs.existsSync(deploymentPath)) {
            existingDeployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        }
        
        // Merge deployments
        const updatedDeployment = {
            ...existingDeployment,
            ...deploymentInfo,
            contracts: {
                ...existingDeployment.contracts,
                ...deploymentInfo.contracts
            }
        };
        
        fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));
        console.log("\n📝 Deployment info saved to:", deploymentPath);
        
        // Load and verify the KYC proof
        console.log("\n=== Verifying KYC Proof On-Chain ===");
        
        const proofPath = path.join(__dirname, "../cache/kyc_test_1752374837774/snark_proof.json");
        if (!fs.existsSync(proofPath)) {
            console.error("❌ Proof file not found:", proofPath);
            console.error("Generate a proof first with: node test_kyc_onchain.js");
            return;
        }
        
        const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
        
        console.log("\nProof details:");
        console.log("- Commitment:", proofData.publicSignals[0]);
        console.log("- Proof Type:", proofData.publicSignals[3], "(1 = KYC)");
        console.log("- Timestamp:", new Date(parseInt(proofData.publicSignals[4]) * 1000).toISOString());
        
        console.log("\nCalling verifyProof...");
        const tx = await verifier.verifyProof(
            proofData.proof.a,
            proofData.proof.b,
            proofData.proof.c,
            proofData.publicSignals
        );
        
        console.log("✅ Verification result:", tx);
        
        // Create Etherscan links
        console.log("\n📋 Etherscan Links:");
        console.log("Contract:", `https://sepolia.etherscan.io/address/${verifier.address}`);
        console.log("Deployment Tx:", `https://sepolia.etherscan.io/tx/${verifier.deployTransaction.hash}`);
        
        console.log("\n✅ Success! KYC proof verified on-chain!");
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.code) console.error("Code:", error.code);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});