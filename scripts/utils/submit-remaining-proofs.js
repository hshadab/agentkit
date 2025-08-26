const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function submitRemainingProofs() {
    console.log("🔗 Submitting KYC and Location Proofs On-Chain");
    console.log("=" .repeat(60));
    
    // Proofs to submit
    const proofs = [
        {
            type: 'KYC',
            proofId: 'proof_kyc_1752383834341',
            description: 'KYC Compliance Proof'
        },
        {
            type: 'Location', 
            proofId: 'proof_location_1752380177607',
            description: 'DePIN Location Proof'
        }
    ];
    
    // Setup Web3
    const web3 = new Web3(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
    
    // Setup account
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY.startsWith('0x') 
        ? process.env.DEPLOYER_PRIVATE_KEY 
        : '0x' + process.env.DEPLOYER_PRIVATE_KEY;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log(`\n📱 Account: ${account.address}`);
    const balance = await web3.eth.getBalance(account.address);
    console.log(`💰 Balance: ${web3.utils.fromWei(balance.toString(), 'ether')} ETH`);
    
    // Contract setup
    const contractAddress = "0x09378444046d1ccb32ca2d5b44fab6634738d067";
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
    console.log(`📄 Verifier: ${contractAddress}`);
    console.log("\n" + "=".repeat(60));
    
    const results = [];
    
    for (const proof of proofs) {
        console.log(`\n\n🚀 Submitting ${proof.type} Proof`);
        console.log("-".repeat(40));
        console.log(`📋 ${proof.description}`);
        console.log(`🆔 Proof ID: ${proof.proofId}`);
        
        try {
            // Fetch proof data
            console.log("\n1️⃣ Fetching proof data...");
            const response = await axios.get(`http://localhost:8001/api/proof/${proof.proofId}/ethereum-integrated`);
            const proofData = response.data;
            console.log("✅ Proof data fetched");
            
            // Prepare transaction
            const tx = contract.methods.verifyProof(
                [proofData.proof.a[0], proofData.proof.a[1]],
                [[proofData.proof.b[0][0], proofData.proof.b[0][1]], 
                 [proofData.proof.b[1][0], proofData.proof.b[1][1]]],
                [proofData.proof.c[0], proofData.proof.c[1]],
                proofData.public_signals
            );
            
            // Estimate gas
            console.log("\n2️⃣ Estimating gas...");
            const gasEstimate = await tx.estimateGas({ from: account.address });
            const gasPrice = await web3.eth.getGasPrice();
            console.log(`   Gas estimate: ${gasEstimate}`);
            console.log(`   Gas price: ${web3.utils.fromWei(gasPrice.toString(), 'gwei')} gwei`);
            
            // Send transaction
            console.log("\n3️⃣ Sending transaction...");
            const receipt = await tx.send({
                from: account.address,
                gas: Math.floor(Number(gasEstimate) * 1.2),
                gasPrice: gasPrice.toString()
            });
            
            console.log("\n🎉 Transaction successful!");
            console.log(`📝 Tx Hash: ${receipt.transactionHash}`);
            console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
            console.log(`📦 Block: ${receipt.blockNumber}`);
            console.log(`⛽ Gas used: ${receipt.gasUsed}`);
            
            results.push({
                type: proof.type,
                proofId: proof.proofId,
                success: true,
                txHash: receipt.transactionHash,
                etherscan: `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed
            });
            
        } catch (error) {
            console.error(`\n❌ Error:`, error.message);
            results.push({
                type: proof.type,
                proofId: proof.proofId,
                success: false,
                error: error.message
            });
        }
    }
    
    // Summary
    console.log("\n\n" + "=".repeat(60));
    console.log("📊 TRANSACTION SUMMARY");
    console.log("=".repeat(60));
    
    for (const result of results) {
        console.log(`\n${result.type}:`);
        if (result.success) {
            console.log(`  ✅ Success`);
            console.log(`  📝 ${result.txHash}`);
            console.log(`  🔗 ${result.etherscan}`);
        } else {
            console.log(`  ❌ Failed: ${result.error}`);
        }
    }
    
    console.log("\n" + "=".repeat(60));
    
    return results;
}

// Run
submitRemainingProofs()
    .then(results => {
        console.log("\n📋 Results JSON:");
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });