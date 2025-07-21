// AI Prediction Commitment on Base
class AIPredictionBase {
    constructor() {
        // Base Sepolia testnet
        this.chainId = '0x14a34'; // 84532 in hex
        this.chainName = 'Base Sepolia';
        this.rpcUrl = 'https://sepolia.base.org';
        
        // Contract will be deployed here
        this.contractAddress = null; // To be deployed
        this.contractABI = [
            {
                "name": "commitPrediction",
                "type": "function",
                "inputs": [
                    {"name": "promptHash", "type": "bytes32"},
                    {"name": "responseHash", "type": "bytes32"}
                ],
                "outputs": [{"name": "commitmentId", "type": "bytes32"}]
            },
            {
                "name": "revealPrediction",
                "type": "function",
                "inputs": [
                    {"name": "prompt", "type": "string"},
                    {"name": "response", "type": "string"},
                    {"name": "nonce", "type": "string"},
                    {"name": "zkProof", "type": "bytes"}
                ],
                "outputs": []
            },
            {
                "name": "getCommitment",
                "type": "function",
                "inputs": [{"name": "commitmentId", "type": "bytes32"}],
                "outputs": [
                    {"name": "promptHash", "type": "bytes32"},
                    {"name": "responseHash", "type": "bytes32"},
                    {"name": "blockNumber", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "predictor", "type": "address"},
                    {"name": "revealed", "type": "bool"}
                ]
            },
            {
                "name": "PredictionCommitted",
                "type": "event",
                "inputs": [
                    {"name": "commitmentId", "type": "bytes32", "indexed": true},
                    {"name": "predictor", "type": "address", "indexed": true},
                    {"name": "blockNumber", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"}
                ]
            }
        ];
    }
    
    async connectToBase() {
        if (!window.ethereum) {
            throw new Error('MetaMask not found');
        }
        
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Check if we're on Base
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            if (chainId !== this.chainId) {
                // Switch to Base
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: this.chainId }],
                    });
                } catch (error) {
                    // Chain doesn't exist, add it
                    if (error.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: this.chainId,
                                chainName: this.chainName,
                                rpcUrls: [this.rpcUrl],
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                blockExplorerUrls: ['https://sepolia.basescan.org']
                            }]
                        });
                    }
                }
            }
            
            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            
            return true;
        } catch (error) {
            console.error('Failed to connect to Base:', error);
            return false;
        }
    }
    
    async commitPrediction(prompt, aiResponse, nonce) {
        if (!this.signer) {
            throw new Error('Not connected to Base');
        }
        
        // Create hashes
        const promptHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(prompt + nonce)
        );
        const responseHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(aiResponse + nonce)
        );
        
        console.log('Committing prediction on Base...');
        console.log('Prompt hash:', promptHash);
        console.log('Response hash:', responseHash);
        
        // Create contract instance
        const contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.signer
        );
        
        // Send transaction
        const tx = await contract.commitPrediction(promptHash, responseHash);
        console.log('Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        // Extract commitment ID from events
        const event = receipt.events.find(e => e.event === 'PredictionCommitted');
        const commitmentId = event.args.commitmentId;
        
        return {
            commitmentId,
            promptHash,
            responseHash,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            timestamp: Math.floor(Date.now() / 1000)
        };
    }
    
    async revealPrediction(prompt, response, nonce, zkProof, commitmentId) {
        if (!this.signer) {
            throw new Error('Not connected to Base');
        }
        
        const contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.signer
        );
        
        // Get current commitment state
        const commitment = await contract.getCommitment(commitmentId);
        console.log('Current commitment state:', commitment);
        
        // Send reveal transaction
        const tx = await contract.revealPrediction(
            prompt,
            response,
            nonce,
            zkProof // ZK proof bytes
        );
        
        console.log('Reveal transaction sent:', tx.hash);
        const receipt = await tx.wait();
        
        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`
        };
    }
    
    // Helper to generate nonce
    generateNonce() {
        return ethers.utils.hexlify(ethers.utils.randomBytes(32));
    }
    
    // Demo function
    async runDemo() {
        console.log('🚀 AI Prediction Commitment Demo on Base');
        
        // Connect to Base
        await this.connectToBase();
        
        // Example prediction
        const prompt = "What will ETH price be tomorrow?";
        const aiResponse = "ETH will reach $3,500 based on technical analysis";
        const nonce = this.generateNonce();
        
        // Step 1: Commit
        console.log('\n📝 Step 1: Committing prediction...');
        const commitment = await this.commitPrediction(prompt, aiResponse, nonce);
        console.log('Committed! ID:', commitment.commitmentId);
        console.log('View on Base Sepolia:', `https://sepolia.basescan.org/tx/${commitment.txHash}`);
        
        // Step 2: Wait (in real scenario, wait for outcome)
        console.log('\n⏳ Step 2: Waiting for outcome...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Step 3: Generate ZK proof
        console.log('\n🔐 Step 3: Generating ZK proof...');
        const zkProof = '0x1234...'; // Would use actual zkEngine here
        
        // Step 4: Reveal
        console.log('\n📢 Step 4: Revealing prediction...');
        const reveal = await this.revealPrediction(
            prompt,
            aiResponse,
            nonce,
            zkProof,
            commitment.commitmentId
        );
        
        console.log('✅ Revealed! View on Base:', reveal.explorerUrl);
    }
}

// Export for use
window.aiPredictionBase = new AIPredictionBase();