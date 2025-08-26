const Web3 = require('web3');
const fs = require('fs');
require('dotenv').config();

async function verifyKYCOnSepolia() {
    console.log("=== KYC Proof On-Chain Verification on Sepolia ===\n");
    
    // Load the proof data we just generated
    const proofPath = '/home/hshadab/agentkit/cache/kyc_test_1752374837774/snark_proof.json';
    const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    
    console.log("1. Proof Data Loaded:");
    console.log("   - Commitment:", proofData.publicSignals[0]);
    console.log("   - Proof Type:", proofData.publicSignals[3], "(1 = KYC)");
    console.log("   - Timestamp:", new Date(parseInt(proofData.publicSignals[4]) * 1000).toISOString());
    
    // Check if we have the simplified verifier deployed
    const deployment = JSON.parse(fs.readFileSync('deployment-sepolia.json', 'utf8'));
    const contractAddress = deployment.contracts.SimplifiedZKVerifier.address;
    
    console.log("\n2. Using Deployed Contract:");
    console.log("   - Address:", contractAddress);
    console.log("   - Network: Sepolia");
    
    // The simplified verifier has a different interface
    console.log("\n3. Preparing Verification Call:");
    console.log("   Note: The deployed SimplifiedZKVerifier uses a simplified interface");
    console.log("   For real Groth16 verification, we need to deploy RealProofOfProofVerifier.sol");
    
    // Show how to verify with the real contract
    console.log("\n4. To Deploy and Verify with Real Contract:");
    console.log("   a) Deploy RealProofOfProofVerifier.sol to Sepolia");
    console.log("   b) Call verifyProof with these parameters:");
    
    const verificationParams = {
        _pA: proofData.proof.a,
        _pB: proofData.proof.b,
        _pC: proofData.proof.c,
        _pubSignals: proofData.publicSignals
    };
    
    console.log(JSON.stringify(verificationParams, null, 2));
    
    // Create deployment script
    const deployScript = `
const hre = require("hardhat");

async function main() {
    console.log("Deploying Real Proof Verifier to Sepolia...");
    
    const Verifier = await hre.ethers.getContractFactory("contracts/RealProofOfProofVerifier.sol:Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.deployed();
    
    console.log("RealProofOfProofVerifier deployed to:", verifier.address);
    
    // Verify the proof
    console.log("\\nVerifying KYC proof...");
    const result = await verifier.verifyProof(
        ${JSON.stringify(proofData.proof.a)},
        ${JSON.stringify(proofData.proof.b)},
        ${JSON.stringify(proofData.proof.c)},
        ${JSON.stringify(proofData.publicSignals)}
    );
    
    console.log("Verification result:", result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
`;
    
    fs.writeFileSync('scripts/deploy_and_verify.js', deployScript);
    console.log("\n5. Deployment script created at: scripts/deploy_and_verify.js");
    console.log("   Run: npx hardhat run scripts/deploy_and_verify.js --network sepolia");
    
    // Show Etherscan verification URL
    console.log("\n6. Manual Verification on Etherscan:");
    console.log("   Once deployed, you can verify directly on Etherscan:");
    console.log("   https://sepolia.etherscan.io/address/[CONTRACT_ADDRESS]#writeContract");
    console.log("   Use the 'verifyProof' function with the parameters above");
    
    // Summary
    console.log("\n7. Summary:");
    console.log("   ✓ KYC proof generated successfully");
    console.log("   ✓ Nova proof converted to Groth16");
    console.log("   ✓ Proof data ready for on-chain verification");
    console.log("   ✓ Contract deployment script created");
    console.log("   ⚠ Need to deploy RealProofOfProofVerifier.sol for actual verification");
}

verifyKYCOnSepolia().catch(console.error);