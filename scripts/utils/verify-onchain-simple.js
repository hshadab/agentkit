const axios = require('axios');
const { Web3 } = require('web3');
require('dotenv').config();

async function verifyOnchain() {
    console.log("🔗 On-Chain Verification Test");
    console.log("=".repeat(60));
    
    const proofId = "proof_kyc_1752383834341";
    
    try {
        // 1. Get proof data
        console.log("\n1️⃣ Fetching proof...");
        const { data: proofData } = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
        console.log("✅ Proof fetched");
        
        // 2. Setup Web3
        console.log("\n2️⃣ Setting up Web3...");
        const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
        
        // Import account
        const privateKey = '0x' + process.env.DEPLOYER_PRIVATE_KEY.replace('0x', '');
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log(`   Account: ${account.address}`);
        
        // 3. Setup contract
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
        
        // 4. Send transaction
        console.log("\n3️⃣ Sending transaction...");
        
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
        
        console.log("\n✅ SUCCESS!");
        console.log("=".repeat(60));
        console.log(`📝 Transaction: ${receipt.transactionHash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
        console.log(`📦 Block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas: ${receipt.gasUsed}`);
        console.log("=".repeat(60));
        
        return {
            success: true,
            txHash: receipt.transactionHash,
            etherscan: `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
        };
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        return { success: false, error: error.message };
    }
}

verifyOnchain().then(console.log).catch(console.error);