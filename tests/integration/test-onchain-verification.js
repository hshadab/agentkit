const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function testOnchainVerification() {
    console.log("🔗 Testing On-Chain Ethereum Verification");
    console.log("=".repeat(60));
    
    const proofId = "proof_kyc_1752383834341";
    
    try {
        // 1. Fetch proof data using integrated endpoint
        console.log("\n1️⃣ Fetching proof data...");
        const response = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
        const proofData = response.data;
        
        console.log("✅ Proof data fetched successfully");
        console.log(`   Public signals: ${proofData.public_signals.length}`);
        console.log(`   Proof ID: ${proofId}`);
        
        // 2. Connect to Ethereum
        console.log("\n2️⃣ Connecting to Ethereum (Sepolia)...");
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        
        // Contract details
        const contractAddress = "0x09378444046d1ccb32ca2d5b44fab6634738d067"; // Real verifier contract
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
        
        // 3. Prepare verification data
        console.log("\n3️⃣ Preparing verification data...");
        const proof = proofData.proof;
        const publicSignals = proofData.public_signals;
        
        // 4. Call verifyProof (view function - no transaction needed)
        console.log("\n4️⃣ Calling verifyProof on-chain...");
        const isValid = await contract.methods.verifyProof(
            [proof.a[0], proof.a[1]],
            [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]],
            [proof.c[0], proof.c[1]],
            publicSignals
        ).call();
        
        console.log(`\n✅ On-chain verification result: ${isValid ? 'VALID' : 'INVALID'}`);
        
        // 5. If we want to store the verification on-chain (requires transaction)
        if (isValid && process.env.DEPLOYER_PRIVATE_KEY) {
            console.log("\n5️⃣ Storing verification on-chain...");
            
            const account = web3.eth.accounts.privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
            web3.eth.accounts.wallet.add(account);
            
            const gasPrice = await web3.eth.getGasPrice();
            const gasEstimate = await contract.methods.verifyProof(
                [proof.a[0], proof.a[1]],
                [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]],
                [proof.c[0], proof.c[1]],
                publicSignals
            ).estimateGas({ from: account.address });
            
            const tx = await contract.methods.verifyProof(
                [proof.a[0], proof.a[1]],
                [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]],
                [proof.c[0], proof.c[1]],
                publicSignals
            ).send({
                from: account.address,
                gas: Math.floor(gasEstimate * 1.2),
                gasPrice: gasPrice
            });
            
            console.log("\n🎉 On-chain verification transaction successful!");
            console.log(`📝 Transaction hash: ${tx.transactionHash}`);
            console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.transactionHash}`);
            console.log(`⛽ Gas used: ${tx.gasUsed}`);
            console.log(`📦 Block number: ${tx.blockNumber}`);
            
            return {
                success: true,
                transactionHash: tx.transactionHash,
                etherscanLink: `https://sepolia.etherscan.io/tx/${tx.transactionHash}`,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed
            };
        }
        
        return {
            success: true,
            verified: isValid,
            message: "Verification checked (no transaction sent)"
        };
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testOnchainVerification()
    .then(result => {
        console.log("\n" + "=".repeat(60));
        console.log("📊 FINAL RESULT:");
        console.log(JSON.stringify(result, null, 2));
    })
    .catch(console.error);