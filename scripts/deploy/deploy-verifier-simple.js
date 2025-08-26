const { Web3 } = require('web3');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

async function deployVerifier() {
    console.log("🚀 Deploying New Verifier Contract");
    console.log("=".repeat(60));
    
    try {
        // 1. First compile using solc command line
        console.log("📄 Compiling contract...");
        
        // Use solcjs to compile
        execSync('npx solcjs --abi --bin contracts/RealProofOfProofVerifier_New.sol -o build/compiled/', { stdio: 'inherit' });
        
        // Find the compiled files
        const files = fs.readdirSync('build/compiled/');
        const binFile = files.find(f => f.endsWith('.bin'));
        const abiFile = files.find(f => f.endsWith('.abi'));
        
        if (!binFile || !abiFile) {
            throw new Error('Compilation output not found');
        }
        
        // Read compiled data
        const bytecode = '0x' + fs.readFileSync(`build/compiled/${binFile}`, 'utf8').trim();
        const abi = JSON.parse(fs.readFileSync(`build/compiled/${abiFile}`, 'utf8'));
        
        console.log("✅ Contract compiled successfully");
        console.log(`📏 Bytecode size: ${(bytecode.length - 2) / 2} bytes`);
        
        // 2. Setup Web3
        const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
        const privateKey = '0x' + process.env.DEPLOYER_PRIVATE_KEY.replace('0x', '');
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        
        console.log(`\n📍 Deployer: ${account.address}`);
        
        // 3. Deploy contract
        console.log("\n📤 Deploying to Sepolia...");
        
        const contract = new web3.eth.Contract(abi);
        const deployTx = contract.deploy({ data: bytecode });
        
        // Create transaction
        const tx = {
            from: account.address,
            data: deployTx.encodeABI(),
            gas: '500000',
            gasPrice: '2000000000' // 2 gwei
        };
        
        // Sign and send
        const signedTx = await account.signTransaction(tx);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        const contractAddress = receipt.contractAddress;
        
        console.log("\n✅ CONTRACT DEPLOYED!");
        console.log("=".repeat(60));
        console.log(`📍 Contract Address: ${contractAddress}`);
        console.log(`📝 Transaction Hash: ${receipt.transactionHash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log(`📦 Block Number: ${receipt.blockNumber}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
        console.log("=".repeat(60));
        
        // 4. Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            chainId: 11155111,
            verifier: {
                address: contractAddress,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                deployer: account.address,
                deployedAt: new Date().toISOString(),
                zkeyFile: "build/real_proof_of_proof_final.zkey"
            }
        };
        
        fs.writeFileSync('deployment-new-verifier.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Deployment info saved!");
        
        // 5. Create automatic update script
        createUpdateScript(contractAddress);
        
        return contractAddress;
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        throw error;
    }
}

function createUpdateScript(newAddress) {
    const updateScript = `const fs = require('fs');

// Files to update
const files = [
    'static/ethereum-verifier.js',
    'static/ethereum-verifier-mock.js',
    'verify-existing-onchain.js',
    'verify-all-proof-types-onchain.js',
    'verify-onchain-simple.js'
];

const oldAddress = '0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29';
const newAddress = '${newAddress}';

console.log('Updating contract addresses...');
console.log('Old:', oldAddress);
console.log('New:', newAddress);

files.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes(oldAddress)) {
                content = content.replace(new RegExp(oldAddress, 'g'), newAddress);
                fs.writeFileSync(file, content);
                console.log('✅ Updated:', file);
            } else {
                console.log('⏭️  Skipped:', file, '(address not found)');
            }
        } else {
            console.log('⚠️  Not found:', file);
        }
    } catch (err) {
        console.error('❌ Error updating', file, ':', err.message);
    }
});

console.log('\\nDone! Run: node verify-all-proof-types-onchain.js');
`;
    
    fs.writeFileSync('update-contract-addresses.js', updateScript);
    console.log("\n📝 Created update-contract-addresses.js");
}

// Deploy
deployVerifier()
    .then(address => {
        console.log("\n✅ SUCCESS! New verifier deployed at:", address);
        console.log("\nNext steps:");
        console.log("1. Run: node update-contract-addresses.js");
        console.log("2. Test: node verify-all-proof-types-onchain.js");
        process.exit(0);
    })
    .catch(err => {
        console.error("Deployment failed:", err);
        process.exit(1);
    });