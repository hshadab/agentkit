const fetch = require('node-fetch');
const fs = require('fs');
const Web3 = require('web3');

async function testFullVerification() {
    console.log("=== Testing Full Ethereum Verification ===\n");
    
    // Step 1: Generate a proof with zkEngine
    console.log("1. Generating zkEngine proof...");
    const proofId = `proof_test_${Date.now()}`;
    
    // Create test proof directory
    const proofDir = `./proofs/${proofId}`;
    fs.mkdirSync(proofDir, { recursive: true });
    
    // Simulate zkEngine proof generation
    const publicInputs = {
        user_id: "12345",
        age: "25",
        location: "US"
    };
    
    const metadata = {
        function: "prove_location",
        arguments: ["US", "25"],
        explanation: "Test proof",
        step_size: 50
    };
    
    // Write test files
    fs.writeFileSync(`${proofDir}/public.json`, JSON.stringify(publicInputs));
    fs.writeFileSync(`${proofDir}/metadata.json`, JSON.stringify(metadata));
    fs.writeFileSync(`${proofDir}/nova_proof.json`, JSON.stringify({ proof: "dummy_nova_proof" }));
    
    console.log(`✅ Created test proof: ${proofId}`);
    
    // Step 2: Generate SNARK proof
    console.log("\n2. Generating SNARK proof...");
    const startTime = Date.now();
    
    try {
        const response = await fetch(`http://localhost:8080/api/proof/${proofId}/ethereum`);
        const data = await response.json();
        
        const endTime = Date.now();
        console.log(`✅ SNARK generated in ${(endTime - startTime) / 1000} seconds`);
        console.log("Proof data:", JSON.stringify(data.proof, null, 2));
        
        // Step 3: Submit to Ethereum
        console.log("\n3. Submitting to Ethereum Sepolia...");
        
        // Connect to Sepolia
        const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
        
        // Your wallet
        const privateKey = '0xd006132e788874ad03ee033985f8f55be4b29cb8e78b60cf5c6537cbd31d9874';
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        // Contract details
        const contractAddress = '0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29';
        const contractABI = JSON.parse(fs.readFileSync('./contracts/ProofOfProofVerifier_abi.json', 'utf8'));
        
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Format proof for contract
        const formattedProof = {
            a: data.proof.a,
            b: data.proof.b,
            c: data.proof.c
        };
        
        const pubSignals = data.public_signals || [
            data.public_inputs.commitment,
            "1",
            data.public_inputs.commitment,
            data.public_inputs.proof_type.toString(),
            data.public_inputs.timestamp.toString(),
            "1"
        ];
        
        console.log("Sending transaction...");
        
        const gasEstimate = await contract.methods
            .verifyProof(
                formattedProof.a,
                formattedProof.b,
                formattedProof.c,
                pubSignals
            )
            .estimateGas({ from: account.address });
        
        const receipt = await contract.methods
            .verifyProof(
                formattedProof.a,
                formattedProof.b,
                formattedProof.c,
                pubSignals
            )
            .send({ 
                from: account.address,
                gas: Math.floor(gasEstimate * 1.2)
            });
        
        console.log("\n✅ Verification successful!");
        console.log(`Transaction hash: ${receipt.transactionHash}`);
        console.log(`Block number: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        
        const etherscanUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
        console.log(`\n🔗 View on Etherscan: ${etherscanUrl}`);
        
        return etherscanUrl;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response) {
            const text = await error.response.text();
            console.error("Response:", text);
        }
    }
}

testFullVerification().catch(console.error);