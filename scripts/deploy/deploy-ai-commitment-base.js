const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 AI Prediction Commitment Contract Deployment to Base Sepolia");
  console.log("=============================================================");
  
  // Check for private key
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY not found in .env file");
    console.error("Please add your MetaMask private key to .env file");
    process.exit(1);
  }
  
  // Connect to Base Sepolia
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("📍 Network: Base Sepolia (Chain ID: 84532)");
  console.log("👛 Deploying with account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ Error: No ETH balance. Please fund your wallet with Base Sepolia ETH");
    console.error("Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    process.exit(1);
  }
  
  // First, compile the contract if needed
  console.log("\n📝 Compiling AI Prediction Commitment contract...");
  
  // Read the Solidity contract
  const contractSource = fs.readFileSync(
    path.join(__dirname, "contracts/AIPredictionCommitment_Base.sol"),
    "utf8"
  );
  
  // For simplicity, we'll use the pre-compiled bytecode and ABI
  // In production, you'd use Hardhat or similar to compile
  const contractABI = [
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "name": "commitmentId", "type": "bytes32"},
        {"indexed": true, "name": "predictor", "type": "address"},
        {"indexed": false, "name": "blockNumber", "type": "uint256"},
        {"indexed": false, "name": "timestamp", "type": "uint256"}
      ],
      "name": "PredictionCommitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "name": "commitmentId", "type": "bytes32"},
        {"indexed": false, "name": "prompt", "type": "string"},
        {"indexed": false, "name": "response", "type": "string"},
        {"indexed": false, "name": "revealBlock", "type": "uint256"},
        {"indexed": false, "name": "commitBlock", "type": "uint256"}
      ],
      "name": "PredictionRevealed",
      "type": "event"
    },
    {
      "inputs": [
        {"name": "promptHash", "type": "bytes32"},
        {"name": "responseHash", "type": "bytes32"}
      ],
      "name": "commitPrediction",
      "outputs": [{"name": "commitmentId", "type": "bytes32"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "prompt", "type": "string"},
        {"name": "response", "type": "string"},
        {"name": "nonce", "type": "string"},
        {"name": "zkProof", "type": "bytes"}
      ],
      "name": "revealPrediction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "commitmentId", "type": "bytes32"}],
      "name": "getCommitment",
      "outputs": [
        {"name": "promptHash", "type": "bytes32"},
        {"name": "responseHash", "type": "bytes32"},
        {"name": "blockNumber", "type": "uint256"},
        {"name": "timestamp", "type": "uint256"},
        {"name": "predictor", "type": "address"},
        {"name": "revealed", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "commitmentId", "type": "bytes32"}],
      "name": "verifyTemporalOrdering",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "", "type": "bytes32"}],
      "name": "commitments",
      "outputs": [
        {"name": "promptHash", "type": "bytes32"},
        {"name": "responseHash", "type": "bytes32"},
        {"name": "blockNumber", "type": "uint256"},
        {"name": "timestamp", "type": "uint256"},
        {"name": "predictor", "type": "address"},
        {"name": "revealed", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  // Bytecode (you'll need to compile this - using placeholder for now)
  console.log("⚠️  Note: You need to compile the contract first!");
  console.log("Run: npx hardhat compile");
  console.log("Then update this script with the compiled bytecode");
  
  // For now, let's check if we have a compiled version
  const artifactPath = path.join(__dirname, "artifacts/contracts/AIPredictionCommitment_Base.sol/AIPredictionCommitment.json");
  
  if (!fs.existsSync(artifactPath)) {
    console.error("\n❌ Contract not compiled yet!");
    console.error("Please run the following commands:");
    console.error("1. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox");
    console.error("2. npx hardhat compile");
    console.error("3. Run this script again");
    process.exit(1);
  }
  
  const contractJson = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;
  
  console.log("\n🚀 Deploying AI Prediction Commitment contract...");
  
  // Deploy the contract
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await contractFactory.deploy();
  
  console.log("⏳ Waiting for deployment...");
  console.log("Transaction hash:", contract.deploymentTransaction().hash);
  
  // Wait for deployment
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("\n✅ AI Prediction Commitment contract deployed!");
  console.log("📍 Contract address:", address);
  console.log("🔗 View on BaseScan: https://sepolia.basescan.org/address/" + address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "Base Sepolia",
    chainId: 84532,
    contractName: "AIPredictionCommitment",
    contractAddress: address,
    deploymentTime: new Date().toISOString(),
    deployer: wallet.address,
    transactionHash: contract.deploymentTransaction().hash,
    abi: abi
  };
  
  fs.writeFileSync(
    path.join(__dirname, "deployment-ai-commitment-base.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📄 Deployment info saved to deployment-ai-commitment-base.json");
  
  // Update the AI prediction handler with the contract address
  console.log("\n🔧 Updating AI prediction handler with contract address...");
  
  const handlerPath = path.join(__dirname, "static/js/ai-prediction-handler.js");
  let handlerContent = fs.readFileSync(handlerPath, "utf8");
  
  // Add contract configuration at the top of the class
  const contractConfig = `
    constructor() {
        this.baseChainId = '0x14a34'; // Base Sepolia
        this.commitments = new Map(); // Store local commitments
        
        // Contract configuration
        this.contractAddress = '${address}';
        this.contractABI = ${JSON.stringify(abi, null, 8).split('\n').map((line, i) => i === 0 ? line : '        ' + line).join('\n')};
    }`;
  
  // Replace the constructor
  handlerContent = handlerContent.replace(
    /constructor\(\) \{[\s\S]*?\}/,
    contractConfig
  );
  
  fs.writeFileSync(handlerPath, handlerContent);
  console.log("✅ AI prediction handler updated!");
  
  console.log("\n🎉 Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. The contract is now live on Base Sepolia");
  console.log("2. The AI prediction handler has been updated with the contract address");
  console.log("3. AI predictions will now create real on-chain commitments");
  console.log("4. Test by generating an AI prediction commitment proof");
  
  // Verify the contract on BaseScan if API key is available
  if (process.env.BASESCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on BaseScan...");
    // Contract verification code would go here
    console.log("(Contract verification not implemented yet)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });