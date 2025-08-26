const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function verifyExistingOnchain() {
    console.log("🔗 Verify Existing Proof On-Chain");
    console.log("=".repeat(60));
    
    // Use the most recent KYC proof
    const proofId = "proof_kyc_1752383834341";
    
    try {
        // 1. Fetch proof data
        console.log("\n1️⃣ Fetching proof data...");
        
        // First try integrated endpoint
        let proofData;
        try {
            const response = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
            proofData = response.data;
            console.log("✅ Using integrated endpoint");
        } catch (e) {
            // Fallback to regular endpoint
            const response = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum`);
            proofData = response.data;
            console.log("✅ Using regular endpoint");
        }
        
        console.log(`   Proof ID: ${proofId}`);
        console.log(`   Public signals: ${proofData.public_signals?.length || proofData.publicSignals?.length}`);
        
        // Normalize public signals name
        if (proofData.publicSignals && !proofData.public_signals) {
            proofData.public_signals = proofData.publicSignals;
        }
        
        // 2. Connect to Ethereum
        console.log("\n2️⃣ Connecting to Ethereum (Sepolia)...");
        const web3 = new Web3(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        
        // Show network info
        const chainId = await web3.eth.getChainId();
        console.log(`   Chain ID: ${chainId} (Sepolia)`);
        
        // Contract details - using the real verifier
        const contractAddress = "0x09378444046d1ccb32ca2d5b44fab6634738d067";
        console.log(`   Contract: ${contractAddress}`);
        
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
        
        // 3. Submit verification transaction
        if (process.env.DEPLOYER_PRIVATE_KEY) {
            console.log("\n3️⃣ Submitting verification transaction...");
            
            const privateKey = process.env.DEPLOYER_PRIVATE_KEY.startsWith('0x') 
                ? process.env.DEPLOYER_PRIVATE_KEY 
                : '0x' + process.env.DEPLOYER_PRIVATE_KEY;
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            web3.eth.accounts.wallet.add(account);
            console.log(`   From: ${account.address}`);
            
            // Check balance
            const balance = await web3.eth.getBalance(account.address);
            console.log(`   Balance: ${web3.utils.fromWei(balance.toString(), 'ether')} ETH`);
            
            if (parseFloat(web3.utils.fromWei(balance.toString(), 'ether')) < 0.01) {
                throw new Error("Insufficient ETH balance for gas");
            }
            
            // Prepare transaction
            const tx = contract.methods.verifyProof(
                [proofData.proof.a[0], proofData.proof.a[1]],
                [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                 [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                [proofData.proof.c[0], proofData.proof.c[1]],
                proofData.public_signals
            );
            
            // Estimate gas
            const gasEstimate = await tx.estimateGas({ from: account.address })
                .catch(err => {
                    console.error("Gas estimation failed:", err.message);
                    return 300000; // Default gas limit
                });
            
            const gasPrice = await web3.eth.getGasPrice();
            console.log(`   Gas estimate: ${gasEstimate}`);
            console.log(`   Gas price: ${web3.utils.fromWei(gasPrice.toString(), 'gwei')} gwei`);
            
            // Send transaction
            console.log("\n📤 Sending transaction...");
            const txReceipt = await tx.send({
                from: account.address,
                gas: Math.floor(gasEstimate * 1.2),
                gasPrice: gasPrice.toString()
            });
            
            console.log("\n✅ TRANSACTION SUCCESSFUL!");
            console.log("=".repeat(60));
            console.log(`📝 Transaction Hash: ${txReceipt.transactionHash}`);
            console.log(`🔗 View on Etherscan:`);
            console.log(`   https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`);
            console.log(`📦 Block: ${txReceipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${txReceipt.gasUsed}`);
            console.log("=".repeat(60));
            
            return {
                success: true,
                transactionHash: txReceipt.transactionHash,
                etherscanLink: `https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`,
                blockNumber: txReceipt.blockNumber,
                gasUsed: txReceipt.gasUsed
            };
        } else {
            console.log("\n⚠️  No private key found - only checking verification");
            
            // Just check if it would verify
            const isValid = await contract.methods.verifyProof(
                [proofData.proof.a[0], proofData.proof.a[1]],
                [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                 [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                [proofData.proof.c[0], proofData.proof.c[1]],
                proofData.public_signals
            ).call();
            
            console.log(`\nVerification result: ${isValid ? 'VALID' : 'INVALID'}`);
            
            return {
                success: true,
                verified: isValid,
                message: "Verification checked (no transaction sent)"
            };
        }
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// Run verification
verifyExistingOnchain()
    .then(result => {
        console.log("\n📊 FINAL RESULT:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });