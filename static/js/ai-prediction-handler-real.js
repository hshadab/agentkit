// AI Prediction Commitment Handler with Real Base Integration
// This handler creates actual on-chain commitments on Base Sepolia

class AIPredictionHandlerReal {
    constructor() {
        this.baseChainId = '0x14a34'; // Base Sepolia
        this.commitments = new Map(); // Store local commitments
        
        // Hardcoded contract address for Base Sepolia
        this.contractAddress = '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC';
        
        // Hardcoded ABI (minimal required methods)
        this.contractABI = [
            {
                "inputs": [
                    {"internalType": "bytes32", "name": "promptHash", "type": "bytes32"},
                    {"internalType": "bytes32", "name": "responseHash", "type": "bytes32"}
                ],
                "name": "commitPrediction",
                "outputs": [{"internalType": "bytes32", "name": "commitmentId", "type": "bytes32"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "bytes32", "name": "commitmentId", "type": "bytes32"},
                    {"indexed": true, "internalType": "address", "name": "predictor", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "blockNumber", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "PredictionCommitted",
                "type": "event"
            }
        ];
        
        this.contract = null;
        this.web3 = null;
        
        // Initialize Web3 if available
        this.initializeWeb3();
    }
    
    async initializeWeb3() {
        if (typeof window.ethereum !== 'undefined' && window.Web3) {
            this.web3 = new Web3(window.ethereum);
            console.log('Web3 initialized for AI predictions');
            
            // Try to load deployment info, but use hardcoded values as fallback
            try {
                const response = await fetch('/deployment-ai-commitment-base.json');
                if (response.ok) {
                    const deploymentInfo = await response.json();
                    // Update with deployment info if available
                    this.contractAddress = deploymentInfo.contractAddress || this.contractAddress;
                    this.contractABI = deploymentInfo.abi || this.contractABI;
                    console.log('AI Prediction contract loaded from deployment file:', this.contractAddress);
                } else {
                    console.log('Using hardcoded contract address:', this.contractAddress);
                }
            } catch (error) {
                console.log('Using hardcoded contract info (fetch failed):', this.contractAddress);
            }
            
            // Initialize contract with whatever we have
            if (this.contractAddress && this.contractABI) {
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                console.log('AI Prediction contract initialized:', this.contractAddress);
            }
        }
    }
    
    async ensureBaseNetwork() {
        if (!window.ethereum) return false;
        
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== this.baseChainId) {
                // Request switch to Base Sepolia
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: this.baseChainId }],
                });
            }
            return true;
        } catch (error) {
            console.error('Failed to switch to Base network:', error);
            return false;
        }
    }

    async createPredictionCommitment(prompt, response) {
        console.log('Creating AI prediction commitment...');
        
        // Generate nonce
        const nonce = this.generateNonce();
        
        // Create hashes using Web3
        const promptWithNonce = prompt + nonce;
        const responseWithNonce = response + nonce;
        
        const promptHash = this.web3 ? 
            this.web3.utils.keccak256(promptWithNonce) :
            '0x' + this.simpleHash(promptWithNonce);
            
        const responseHash = this.web3 ? 
            this.web3.utils.keccak256(responseWithNonce) :
            '0x' + this.simpleHash(responseWithNonce);
        
        // Convert hashes to integers for zkEngine (first 8 hex chars)
        const promptHashInt = parseInt(promptHash.substring(2, 10), 16);
        const responseHashInt = parseInt(responseHash.substring(2, 10), 16);
        
        // Get current timestamp
        const commitmentTimestamp = Math.floor(Date.now() / 1000);
        
        // Store commitment data
        const commitmentData = {
            prompt,
            response,
            nonce,
            promptHash,
            responseHash,
            promptHashInt,
            responseHashInt,
            commitmentTimestamp,
            status: 'pending_blockchain'
        };
        
        // Try to commit to Base blockchain if contract is available
        if (this.contract && window.ethereum) {
            try {
                await this.ensureBaseNetwork();
                
                const accounts = await this.web3.eth.getAccounts();
                if (accounts.length === 0) {
                    throw new Error('No accounts available');
                }
                
                console.log('Submitting commitment to Base blockchain...');
                
                // Get current gas price
                let baseGasPrice = await this.web3.eth.getGasPrice();
                console.log('Network gas price:', baseGasPrice, 'wei');
                
                // For Base Sepolia testnet, cap the gas price to ensure it's reasonable
                const maxTestnetGasPrice = this.web3.utils.toWei('0.1', 'gwei'); // 0.1 gwei max for testnet
                if (BigInt(baseGasPrice) > BigInt(maxTestnetGasPrice)) {
                    console.log('Capping gas price for testnet to 0.1 gwei');
                    baseGasPrice = maxTestnetGasPrice;
                }
                
                // Call the contract with capped gas price
                const receipt = await this.contract.methods
                    .commitPrediction(promptHash, responseHash)
                    .send({ 
                        from: accounts[0],
                        gas: 200000,
                        gasPrice: baseGasPrice // Use capped gas price
                    });
                
                console.log('Commitment transaction:', receipt.transactionHash);
                
                // Update commitment data with real transaction
                commitmentData.txHash = receipt.transactionHash;
                commitmentData.blockNumber = receipt.blockNumber;
                commitmentData.commitmentId = receipt.events.PredictionCommitted.returnValues.commitmentId;
                commitmentData.baseExplorerUrl = `https://sepolia.basescan.org/tx/${receipt.transactionHash}`;
                commitmentData.status = 'committed';
                commitmentData.isReal = true;
                
                // Success - no toast notification
                
            } catch (error) {
                console.error('Blockchain commitment failed:', error);
                // Throw error - no demo mode fallback
                commitmentData.status = 'failed';
                commitmentData.isReal = false;
                commitmentData.error = error.message;
                
                // Error - no toast notification
                
                throw new Error(`Failed to create blockchain commitment: ${error.message}`);
            }
        } else {
            // Contract not available - require real deployment
            console.error('AI Prediction contract not deployed');
            commitmentData.status = 'failed';
            commitmentData.isReal = false;
            commitmentData.error = 'Contract not deployed';
            
            // Error - no toast notification
            
            throw new Error('AI Prediction contract not deployed on Base. Real blockchain commitment required.');
        }
        
        // Store locally
        const commitmentId = this.web3 ? 
            this.web3.utils.keccak256(promptHash + responseHash) :
            '0x' + this.simpleHash(promptHash + responseHash);
            
        this.commitments.set(commitmentId, commitmentData);
        
        return commitmentData;
    }

    generateNonce() {
        // Generate random 16 bytes
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    
    simpleHash(str) {
        // Simple hash function for when Web3 isn't available
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    getCommitmentForProof(commitmentId) {
        return this.commitments.get(commitmentId);
    }

    // Generate proof arguments for zkEngine
    getProofArguments(commitmentData, revealTimestamp = null) {
        if (!revealTimestamp) {
            revealTimestamp = Math.floor(Date.now() / 1000);
        }
        
        return {
            prompt_hash: commitmentData.promptHashInt,
            response_hash: commitmentData.responseHashInt,
            commitment_timestamp: commitmentData.commitmentTimestamp,
            reveal_timestamp: revealTimestamp
        };
    }
    
    // Get commitment details from blockchain
    async getCommitmentFromChain(commitmentId) {
        if (!this.contract) {
            console.log('No contract available');
            return null;
        }
        
        try {
            const result = await this.contract.methods.getCommitment(commitmentId).call();
            return {
                promptHash: result.promptHash,
                responseHash: result.responseHash,
                blockNumber: result.blockNumber,
                timestamp: result.timestamp,
                predictor: result.predictor,
                revealed: result.revealed
            };
        } catch (error) {
            console.error('Failed to get commitment from chain:', error);
            return null;
        }
    }
}

// Export for use
window.aiPredictionHandler = new AIPredictionHandlerReal();