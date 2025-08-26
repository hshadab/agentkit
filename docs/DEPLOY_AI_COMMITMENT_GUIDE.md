# Deploy AI Prediction Commitment to Base - Complete Guide

## Prerequisites

1. **MetaMask Wallet** with:
   - Base Sepolia network added
   - Some Base Sepolia ETH for gas fees
   - Private key exported

2. **Node.js** and npm installed

3. **Your Coinbase Developer Platform API Key**: `30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a`

## Step 1: Set Up Environment

1. Create `.env` file if it doesn't exist:
```bash
cp env.example .env
```

2. Edit `.env` and add your MetaMask private key:
```
PRIVATE_KEY=your_metamask_private_key_here
```

3. Add your Coinbase API key (optional, for enhanced features):
```
COINBASE_API_KEY=30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a
```

## Step 2: Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

## Step 3: Initialize Hardhat

```bash
npx hardhat init
```

Choose:
- Create a JavaScript project
- Use default settings
- Install dependencies

## Step 4: Configure Hardhat for Base

Edit `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## Step 5: Compile the Contract

```bash
npx hardhat compile
```

This will compile `contracts/AIPredictionCommitment_Base.sol`.

## Step 6: Deploy to Base Sepolia

Run the deployment script:

```bash
node deploy-ai-commitment-base.js
```

This will:
1. Deploy the contract to Base Sepolia
2. Save deployment info to `deployment-ai-commitment-base.json`
3. Update `ai-prediction-handler-real.js` with the contract address

## Step 7: Fund Your Wallet (if needed)

Get Base Sepolia ETH from:
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- https://faucet.quicknode.com/base/sepolia

## Step 8: Test the Integration

1. Start the zkEngine server:
```bash
cargo run --release
```

2. Start the chat service:
```bash
python chat_service.py
```

3. Open the UI at http://localhost:8001

4. Generate an AI prediction proof:
   - Type: "Generate AI prediction commitment proof"
   - MetaMask will prompt you to:
     - Switch to Base Sepolia network
     - Sign the commitment transaction

5. The proof card will show:
   - "Base Commitment" with a real transaction link
   - Click the link to view on BaseScan
   - The transaction will show the commitment data

## Step 9: Understanding the Flow

### When you generate an AI prediction proof:

1. **Frontend** (ai-prediction-handler-real.js):
   - Creates hashes of prompt and AI response
   - Calls the smart contract's `commitPrediction` function
   - Pays gas fees on Base Sepolia
   - Gets back a transaction hash and commitment ID

2. **Smart Contract** (on Base):
   - Stores the commitment on-chain
   - Emits a `PredictionCommitted` event
   - Records block number and timestamp

3. **ZK Proof** (zkEngine):
   - Generates proof that commitment happened before reveal
   - Proves temporal ordering without revealing content

4. **Proof Card**:
   - Shows real Base transaction link
   - Displays block number and timestamp
   - Indicates this is a real on-chain commitment

## Step 10: Verify Deployment

Check that your contract is live:

1. Open the deployment info:
```bash
cat deployment-ai-commitment-base.json
```

2. Visit the contract on BaseScan:
   - Copy the `contractAddress`
   - Go to: https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS

3. You should see:
   - Contract code
   - Transactions (your commitments)
   - Events (PredictionCommitted)

## Troubleshooting

### "No ETH balance"
- Get free Base Sepolia ETH from faucets listed above

### "Transaction failed"
- Check gas price and increase if needed
- Ensure MetaMask is on Base Sepolia network

### "Contract not found"
- Run `npx hardhat compile` first
- Check that compilation succeeded

### "MetaMask not prompting"
- Ensure MetaMask is unlocked
- Check that Base Sepolia network is added
- Refresh the page

## Production Considerations

1. **Gas Optimization**: The contract is simple but could be optimized further
2. **Access Control**: Currently anyone can commit - add restrictions if needed
3. **Reveal Mechanism**: Implement the reveal function for full commit-reveal
4. **Event Indexing**: Set up event listening for real-time updates
5. **IPFS Integration**: Store full content on IPFS, only hash on-chain

## Next Steps

1. **Monitor Your Commitments**:
   - View all transactions at your contract address
   - Each commitment is permanently timestamped

2. **Build Applications**:
   - AI prediction markets
   - Temporal proof systems
   - Audit trails for AI decisions

3. **Enhance Privacy**:
   - Implement full ZK reveal proofs
   - Add selective disclosure features

Your AI predictions are now cryptographically timestamped on Base blockchain!