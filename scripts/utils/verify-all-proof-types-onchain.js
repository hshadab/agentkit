const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function verifyAllProofTypes() {
    console.log("🧪 Testing All 3 Proof Types On-Chain");
    console.log("=".repeat(70));
    
    // Find existing proofs for each type
    const proofs = [
        { id: "proof_kyc_1752383834341", type: "KYC", expectedType: 1 },
        { id: "proof_location_1752380177607", type: "Location", expectedType: 2 },
        { id: "proof_ai_content_1752380242318", type: "AI Content", expectedType: 3 }
    ];
    
    const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
    const privateKey = '0x' + process.env.DEPLOYER_PRIVATE_KEY.replace('0x', '');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    const contractAddress = "0x09378444046d1ccb32ca2d5b44fab6634738d067";
    const abi = [{
        "inputs": [
            {"name": "_pA", "type": "uint256[2]"},
            {"name": "_pB", "type": "uint256[2][2]"},
            {"name": "_pC", "type": "uint256[2]"},
            {"name": "_pubSignals", "type": "uint256[6]"}
        ],
        "name": "verifyProof",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }];
    
    const contract = new web3.eth.Contract(abi, contractAddress);
    const results = [];
    
    for (const proof of proofs) {
        console.log(`\n${"=".repeat(70)}`);
        console.log(`📋 Testing ${proof.type} Proof: ${proof.id}`);
        console.log("-".repeat(70));
        
        try {
            // 1. Fetch proof data
            console.log("\n1️⃣ Fetching proof data...");
            const { data: proofData } = await axios.get(
                `http://localhost:8001/api/proof/${proof.id}/ethereum-integrated`
            );
            
            console.log("✅ Proof fetched successfully");
            console.log(`   Public signals: ${proofData.public_signals.length}`);
            
            // Verify proof type from public signals
            const proofTypeSignal = parseInt(proofData.public_signals[3], 16);
            console.log(`   Proof type in signal: ${proofTypeSignal} (expected: ${proof.expectedType})`);
            
            if (proofTypeSignal !== proof.expectedType) {
                console.warn(`   ⚠️  Warning: Proof type mismatch!`);
            }
            
            // 2. Test on-chain verification (call only, no transaction)
            console.log("\n2️⃣ Testing on-chain verification...");
            const isValid = await contract.methods.verifyProof(
                [proofData.proof.a[0], proofData.proof.a[1]],
                [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                 [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                [proofData.proof.c[0], proofData.proof.c[1]],
                proofData.public_signals
            ).call();
            
            console.log(`   Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
            
            // 3. If valid, submit one transaction as example
            if (isValid && proof.type === "AI Content") { // Only submit AI Content as example
                console.log("\n3️⃣ Submitting on-chain transaction...");
                
                const txData = contract.methods.verifyProof(
                    [proofData.proof.a[0], proofData.proof.a[1]],
                    [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                     [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                    [proofData.proof.c[0], proofData.proof.c[1]],
                    proofData.public_signals
                ).encodeABI();
                
                const tx = {
                    from: account.address,
                    to: contractAddress,
                    data: txData,
                    gas: '300000',
                    gasPrice: '2000000000' // 2 gwei
                };
                
                const signedTx = await account.signTransaction(tx);
                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                
                console.log("\n🎉 Transaction Successful!");
                console.log(`   📝 Tx Hash: ${receipt.transactionHash}`);
                console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
                console.log(`   ⛽ Gas Used: ${receipt.gasUsed}`);
                
                results.push({
                    type: proof.type,
                    proofId: proof.id,
                    valid: true,
                    proofType: proofTypeSignal,
                    txHash: receipt.transactionHash,
                    etherscan: `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
                });
            } else {
                results.push({
                    type: proof.type,
                    proofId: proof.id,
                    valid: isValid,
                    proofType: proofTypeSignal,
                    message: isValid ? "Verified (no tx sent)" : "Invalid proof"
                });
            }
            
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            results.push({
                type: proof.type,
                proofId: proof.id,
                valid: false,
                error: error.message
            });
        }
    }
    
    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 SUMMARY: ALL PROOF TYPES");
    console.log("=".repeat(70));
    
    for (const result of results) {
        console.log(`\n${result.type}:`);
        console.log(`   Proof ID: ${result.proofId}`);
        console.log(`   Valid: ${result.valid ? '✅ YES' : '❌ NO'}`);
        console.log(`   Type Signal: ${result.proofType || 'N/A'}`);
        if (result.txHash) {
            console.log(`   Transaction: ${result.txHash}`);
            console.log(`   View: ${result.etherscan}`);
        } else if (result.message) {
            console.log(`   Status: ${result.message}`);
        } else if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }
    
    const allValid = results.every(r => r.valid);
    console.log("\n" + "=".repeat(70));
    console.log(`FINAL RESULT: ${allValid ? '✅ ALL 3 PROOF TYPES WORK!' : '❌ Some proofs failed'}`);
    console.log("=".repeat(70));
    
    return results;
}

// Run the test
verifyAllProofTypes()
    .then(results => {
        console.log("\n📋 Results JSON:", JSON.stringify(results, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });