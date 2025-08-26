const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function generateAndVerifyOnchain() {
    console.log("🚀 Generate New Proof and Verify On-Chain");
    console.log("=".repeat(60));
    
    try {
        // 1. Generate a new KYC proof
        console.log("\n1️⃣ Generating new KYC proof...");
        const proofId = `proof_kyc_${Date.now()}`;
        
        const workflowRequest = {
            content: "Generate KYC proof",
            metadata: {
                function: "prove_kyc",
                arguments: ["12345", "1"],
                step_size: 50,
                explanation: "Testing on-chain verification"
            },
            proof_id: proofId
        };
        
        const genResponse = await axios.post('http://localhost:8002/workflow_update', workflowRequest);
        console.log("✅ Proof generation initiated");
        
        // Wait for proof generation
        console.log("⏳ Waiting for proof generation (15 seconds)...");
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // 2. Fetch proof data
        console.log("\n2️⃣ Fetching proof data...");
        const proofResponse = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
        const proofData = proofResponse.data;
        
        console.log("✅ Proof data fetched");
        console.log(`   Proof ID: ${proofId}`);
        console.log(`   Public signals: ${proofData.public_signals.length}`);
        
        // 3. Connect to Ethereum
        console.log("\n3️⃣ Testing on-chain verification...");
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        
        const contractAddress = "0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29";
        const contractABI = [
            {
                "inputs": [
                    {"internalType": "uint[2]", "name": "_pA", "type": "uint256[2]"},
                    {"internalType": "uint[2][2]", "name": "_pB", "type": "uint256[2][2]"},
                    {"internalType": "uint[2]", "name": "_pC", "type": "uint256[2]"},
                    {"internalType": "uint[6]", "name": "_pubSignals", "type": "uint256[6]"}
                ],
                "name": "verifyProof",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Verify proof
        const isValid = await contract.methods.verifyProof(
            [proofData.proof.a[0], proofData.proof.a[1]],
            [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
             [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
            [proofData.proof.c[0], proofData.proof.c[1]],
            proofData.public_signals
        ).call();
        
        console.log(`\n✅ On-chain verification: ${isValid ? 'VALID' : 'INVALID'}`);
        
        // 4. If valid and we have private key, submit transaction
        if (isValid && process.env.DEPLOYER_PRIVATE_KEY) {
            console.log("\n4️⃣ Submitting verification transaction...");
            
            const account = web3.eth.accounts.privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
            web3.eth.accounts.wallet.add(account);
            
            const gasPrice = await web3.eth.getGasPrice();
            const nonce = await web3.eth.getTransactionCount(account.address);
            
            const tx = contract.methods.verifyProof(
                [proofData.proof.a[0], proofData.proof.a[1]],
                [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                 [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                [proofData.proof.c[0], proofData.proof.c[1]],
                proofData.public_signals
            );
            
            const gas = await tx.estimateGas({ from: account.address });
            
            const txReceipt = await tx.send({
                from: account.address,
                gas: Math.floor(gas * 1.2),
                gasPrice: gasPrice,
                nonce: nonce
            });
            
            console.log("\n🎉 ON-CHAIN VERIFICATION SUCCESSFUL!");
            console.log("=".repeat(60));
            console.log(`📝 Transaction Hash: ${txReceipt.transactionHash}`);
            console.log(`🔗 Etherscan Link: https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`);
            console.log(`📦 Block Number: ${txReceipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${txReceipt.gasUsed}`);
            console.log("=".repeat(60));
            
            return {
                success: true,
                proofId: proofId,
                transactionHash: txReceipt.transactionHash,
                etherscanLink: `https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`,
                blockNumber: txReceipt.blockNumber,
                gasUsed: txReceipt.gasUsed.toString()
            };
        }
        
        return {
            success: true,
            verified: isValid,
            proofId: proofId,
            message: "Verification checked (no transaction sent)"
        };
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
generateAndVerifyOnchain()
    .then(result => {
        console.log("\n📊 RESULT:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });