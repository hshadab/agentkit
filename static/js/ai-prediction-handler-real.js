// AI Prediction Commitment Handler with Real Base Integration
// This handler creates actual on-chain commitments on Base Sepolia

class AIPredictionHandlerReal {
    constructor() {
        this.baseChainId = '0x14a34'; // Base Sepolia
        this.commitments = new Map(); // Store local commitments
        
        // Contract will be configured after deployment
        this.contractAddress = null;
        this.contractABI = null;
        this.contract = null;
        this.web3 = null;
        
        // Initialize Web3 if available
        this.initializeWeb3();
    }
    
    async initializeWeb3() {
        if (typeof window.ethereum !== 'undefined' && window.Web3) {
            this.web3 = new Web3(window.ethereum);
            console.log('Web3 initialized for AI predictions');
            
            // Check if we have deployment info
            try {
                const response = await fetch('/deployment-ai-commitment-base.json');
                if (response.ok) {
                    const deploymentInfo = await response.json();
                    this.contractAddress = deploymentInfo.contractAddress;
                    this.contractABI = deploymentInfo.abi;
                    
                    // Initialize contract
                    this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                    console.log('AI Prediction contract loaded:', this.contractAddress);
                }
            } catch (error) {
                console.log('No deployment info found, using demo mode');
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
                
                // Call the contract
                const receipt = await this.contract.methods
                    .commitPrediction(promptHash, responseHash)
                    .send({ 
                        from: accounts[0],
                        gas: 200000 
                    });
                
                console.log('Commitment transaction:', receipt.transactionHash);
                
                // Update commitment data with real transaction
                commitmentData.txHash = receipt.transactionHash;
                commitmentData.blockNumber = receipt.blockNumber;
                commitmentData.commitmentId = receipt.events.PredictionCommitted.returnValues.commitmentId;
                commitmentData.baseExplorerUrl = `https://sepolia.basescan.org/tx/${receipt.transactionHash}`;
                commitmentData.status = 'committed';
                commitmentData.isReal = true;
                
                // Show success message
                if (window.uiManager) {
                    window.uiManager.showToast('AI prediction committed on Base blockchain!', 'success');
                }
                
            } catch (error) {
                console.error('Blockchain commitment failed:', error);
                // Fall back to demo mode
                commitmentData.txHash = this.generateDemoTxHash(commitmentData);
                commitmentData.baseExplorerUrl = `https://sepolia.basescan.org/tx/${commitmentData.txHash}`;
                commitmentData.status = 'committed_demo';
                commitmentData.isReal = false;
                
                if (window.uiManager) {
                    window.uiManager.showToast('Using demo mode (blockchain commitment failed)', 'warning');
                }
            }
        } else {
            // Demo mode - no contract deployed
            console.log('Running in demo mode (no contract)');
            commitmentData.txHash = this.generateDemoTxHash(commitmentData);
            commitmentData.baseExplorerUrl = `https://sepolia.basescan.org/tx/${commitmentData.txHash}`;
            commitmentData.status = 'committed_demo';
            commitmentData.isReal = false;
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
    
    generateDemoTxHash(commitmentData) {
        // Generate a deterministic demo hash
        const data = JSON.stringify({
            promptHash: commitmentData.promptHash,
            responseHash: commitmentData.responseHash,
            timestamp: commitmentData.commitmentTimestamp
        });
        
        if (this.web3) {
            return this.web3.utils.keccak256(data);
        } else {
            return '0x' + this.simpleHash(data);
        }
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