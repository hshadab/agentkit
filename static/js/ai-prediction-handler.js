// AI Prediction Commitment Handler
// Manages the commit-reveal process with Base blockchain

class AIPredictionHandler {
    
    constructor() {
        this.baseChainId = '0x14a34'; // Base Sepolia
        this.commitments = new Map(); // Store local commitments
        
        // Contract configuration
        this.contractAddress = '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC';
        this.contractABI = [
                {
                        "anonymous": false,
                        "inputs": [
                                {
                                        "indexed": true,
                                        "internalType": "bytes32",
                                        "name": "commitmentId",
                                        "type": "bytes32"
                                },
                                {
                                        "indexed": true,
                                        "internalType": "address",
                                        "name": "predictor",
                                        "type": "address"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "uint256",
                                        "name": "blockNumber",
                                        "type": "uint256"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "uint256",
                                        "name": "timestamp",
                                        "type": "uint256"
                                }
                        ],
                        "name": "PredictionCommitted",
                        "type": "event"
                },
                {
                        "anonymous": false,
                        "inputs": [
                                {
                                        "indexed": true,
                                        "internalType": "bytes32",
                                        "name": "commitmentId",
                                        "type": "bytes32"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "string",
                                        "name": "prompt",
                                        "type": "string"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "string",
                                        "name": "response",
                                        "type": "string"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "uint256",
                                        "name": "revealBlock",
                                        "type": "uint256"
                                },
                                {
                                        "indexed": false,
                                        "internalType": "uint256",
                                        "name": "commitBlock",
                                        "type": "uint256"
                                }
                        ],
                        "name": "PredictionRevealed",
                        "type": "event"
                },
                {
                        "inputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "promptHash",
                                        "type": "bytes32"
                                },
                                {
                                        "internalType": "bytes32",
                                        "name": "responseHash",
                                        "type": "bytes32"
                                }
                        ],
                        "name": "commitPrediction",
                        "outputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "commitmentId",
                                        "type": "bytes32"
                                }
                        ],
                        "stateMutability": "nonpayable",
                        "type": "function"
                },
                {
                        "inputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "",
                                        "type": "bytes32"
                                }
                        ],
                        "name": "commitments",
                        "outputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "promptHash",
                                        "type": "bytes32"
                                },
                                {
                                        "internalType": "bytes32",
                                        "name": "responseHash",
                                        "type": "bytes32"
                                },
                                {
                                        "internalType": "uint256",
                                        "name": "blockNumber",
                                        "type": "uint256"
                                },
                                {
                                        "internalType": "uint256",
                                        "name": "timestamp",
                                        "type": "uint256"
                                },
                                {
                                        "internalType": "address",
                                        "name": "predictor",
                                        "type": "address"
                                },
                                {
                                        "internalType": "bool",
                                        "name": "revealed",
                                        "type": "bool"
                                }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                },
                {
                        "inputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "commitmentId",
                                        "type": "bytes32"
                                }
                        ],
                        "name": "getCommitment",
                        "outputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "promptHash",
                                        "type": "bytes32"
                                },
                                {
                                        "internalType": "bytes32",
                                        "name": "responseHash",
                                        "type": "bytes32"
                                },
                                {
                                        "internalType": "uint256",
                                        "name": "blockNumber",
                                        "type": "uint256"
                                },
                                {
                                        "internalType": "uint256",
                                        "name": "timestamp",
                                        "type": "uint256"
                                },
                                {
                                        "internalType": "address",
                                        "name": "predictor",
                                        "type": "address"
                                },
                                {
                                        "internalType": "bool",
                                        "name": "revealed",
                                        "type": "bool"
                                }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                },
                {
                        "inputs": [
                                {
                                        "internalType": "string",
                                        "name": "prompt",
                                        "type": "string"
                                },
                                {
                                        "internalType": "string",
                                        "name": "response",
                                        "type": "string"
                                },
                                {
                                        "internalType": "string",
                                        "name": "nonce",
                                        "type": "string"
                                },
                                {
                                        "internalType": "bytes",
                                        "name": "zkProof",
                                        "type": "bytes"
                                }
                        ],
                        "name": "revealPrediction",
                        "outputs": [],
                        "stateMutability": "nonpayable",
                        "type": "function"
                },
                {
                        "inputs": [
                                {
                                        "internalType": "bytes32",
                                        "name": "commitmentId",
                                        "type": "bytes32"
                                }
                        ],
                        "name": "verifyTemporalOrdering",
                        "outputs": [
                                {
                                        "internalType": "bool",
                                        "name": "",
                                        "type": "bool"
                                }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                }
        ];
    }

    async createPredictionCommitment(prompt, response) {
        console.log('Creating AI prediction commitment...');
        
        // Generate nonce
        const nonce = this.generateNonce();
        
        // Create hashes
        const promptHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(prompt + nonce)
        );
        const responseHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(response + nonce)
        );
        
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
        
        // For now, simulate blockchain commitment
        // In production, this would call the Base smart contract
        console.log('Commitment data prepared:', {
            promptHash: promptHash.substring(0, 10) + '...',
            responseHash: responseHash.substring(0, 10) + '...',
            timestamp: commitmentTimestamp
        });
        
        // Simulate Base transaction (in production, use actual contract)
        const simulatedTxHash = '0x' + ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(JSON.stringify(commitmentData))
        ).substring(2, 66);
        
        commitmentData.txHash = simulatedTxHash;
        commitmentData.baseExplorerUrl = `https://sepolia.basescan.org/tx/${simulatedTxHash}`;
        commitmentData.status = 'committed';
        
        // Store locally
        const commitmentId = ethers.utils.id(promptHash + responseHash);
        this.commitments.set(commitmentId, commitmentData);
        
        return commitmentData;
    }

    generateNonce() {
        return ethers.utils.hexlify(ethers.utils.randomBytes(16));
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
}

// Export for use
window.aiPredictionHandler = new AIPredictionHandler();