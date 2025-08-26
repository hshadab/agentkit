const { Web3 } = require('web3');
const fs = require('fs');

async function manualVerify() {
    console.log("=== Manual Ethereum Verification ===\n");
    
    // Connect to Sepolia
    const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
    
    // Your wallet
    const privateKey = '0xd006132e788874ad03ee033985f8f55be4b29cb8e78b60cf5c6537cbd31d9874';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log("Wallet address:", account.address);
    
    // Contract details
    const contractAddress = '0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29';
    const contractJSON = JSON.parse(fs.readFileSync('./artifacts/contracts/ProofOfProofVerifier.sol/Groth16Verifier.json', 'utf8'));
    const contractABI = contractJSON.abi;
    
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    
    // Use the test proof we just generated
    const proof = {
        a: [
            "17416557482935116212138995140265570651160053906017312173682203952534902923140",
            "19060931836702637023384677471842244904671293358981773059620780339701872335543"
        ],
        b: [
            [
                "10746555875435239054822229996732764975518311136891458537439073531792874021066",
                "11629173627235968368489759690749382442619271599589964311947655027313188303555"
            ],
            [
                "15661521792749240903080611591360459044654637897487898002046076982867163548907",
                "16008732639118026023562872422018414382545632514691842720721784181529542854023"
            ]
        ],
        c: [
            "18890319746052359921655100768711900456134562064732989292650337247886523436860",
            "3221100558493847826487205346151078072427099571928968352267278694889305627359"
        ]
    };
    
    const publicSignals = [
        '7607831199498317321519392041268349796668427361682770694643943953189625976245',
        '1',
        '286382437619652436479056529014165815792187318473205010592697563038849963087',
        '1',
        '1752159364',
        '1'
    ];
    
    try {
        console.log("Estimating gas...");
        const gasEstimate = await contract.methods
            .verifyProof(
                proof.a,
                proof.b,
                proof.c,
                publicSignals
            )
            .estimateGas({ from: account.address });
        
        console.log("Gas estimate:", gasEstimate);
        console.log("\nSending transaction...");
        
        const receipt = await contract.methods
            .verifyProof(
                proof.a,
                proof.b,
                proof.c,
                publicSignals
            )
            .send({ 
                from: account.address,
                gas: Math.floor(Number(gasEstimate) * 1.2)
            });
        
        console.log("\n✅ Verification successful!");
        console.log(`Transaction hash: ${receipt.transactionHash}`);
        console.log(`Block number: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        
        const etherscanUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
        console.log(`\n🔗 View on Etherscan: ${etherscanUrl}`);
        
        return etherscanUrl;
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.receipt) {
            console.log("Transaction receipt:", error.receipt);
        }
    }
}

manualVerify().catch(console.error);