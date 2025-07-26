// Avalanche Proof Verifier Integration
// This handles the connection to Avalanche C-Chain and proof verification on-chain

class AvalancheVerifier {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = null;
        this.isConnected = false;
        
        // Same Groth16Verifier contract ABI as Ethereum
        this.contractABI = [
            {
                "inputs": [
                    {
                        "internalType": "uint[2]",
                        "name": "_pA",
                        "type": "uint256[2]"
                    },
                    {
                        "internalType": "uint[2][2]",
                        "name": "_pB",
                        "type": "uint256[2][2]"
                    },
                    {
                        "internalType": "uint[2]",
                        "name": "_pC",
                        "type": "uint256[2]"
                    },
                    {
                        "internalType": "uint[6]",
                        "name": "_pubSignals",
                        "type": "uint256[6]"
                    }
                ],
                "name": "verifyProof",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                "name": "verifiedProofs",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "user", "type": "address"},
                    {"internalType": "uint256", "name": "proofType", "type": "uint256"}
                ],
                "name": "isUserVerified",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "bytes32", "name": "proofId", "type": "bytes32"},
                    {"indexed": true, "internalType": "address", "name": "verifier", "type": "address"},
                    {"indexed": false, "internalType": "bool", "name": "isValid", "type": "bool"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "ProofVerified",
                "type": "event"
            }
        ];
    }
    
    async connect() {
        try {
            // Check for wallet provider
            let provider = null;
            let walletName = '';
            
            // Use any available Ethereum wallet (MetaMask, etc.)
            if (window.ethereum) {
                provider = window.ethereum;
                walletName = window.ethereum.isMetaMask ? 'MetaMask' : 'Ethereum Wallet';
                console.log(`${walletName} detected`);
            } 
            else {
                throw new Error('No wallet detected. Please install MetaMask or another Ethereum wallet.');
            }
            
            // Request account access
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            
            console.log(`Connected to ${walletName} wallet:`, this.account);
            
            // Initialize Web3
            this.web3 = new Web3(provider);
            
            // Store wallet type for later checks
            this.walletType = walletName;
            
            // Check network
            const chainId = await this.web3.eth.getChainId();
            const expectedChainId = 43113; // Avalanche Fuji testnet
            
            console.log('Current chain ID:', chainId);
            console.log('Expected chain ID:', expectedChainId);
            
            if (Number(chainId) !== expectedChainId) {
                console.log('Wrong network, attempting to switch to Avalanche Fuji...');
                try {
                    // Try to switch to Avalanche Fuji
                    await provider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xa869' }], // 43113 in hex
                    });
                    console.log('Successfully switched to Avalanche Fuji');
                } catch (switchError) {
                    // If the network doesn't exist, add it
                    if (switchError.code === 4902) {
                        console.log('Avalanche Fuji not found, adding network...');
                        try {
                            await provider.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0xa869',
                                    chainName: 'Avalanche Fuji Testnet',
                                    nativeCurrency: {
                                        name: 'AVAX',
                                        symbol: 'AVAX',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                                    blockExplorerUrls: ['https://testnet.snowtrace.io']
                                }],
                            });
                            console.log('Successfully added and switched to Avalanche Fuji');
                        } catch (addError) {
                            throw new Error('Failed to add Avalanche Fuji network. Please add it manually in MetaMask.');
                        }
                    } else {
                        throw new Error('User rejected network switch. Please switch to Avalanche Fuji manually.');
                    }
                }
                
                // Verify we're now on the right network
                const newChainId = await this.web3.eth.getChainId();
                if (Number(newChainId) !== expectedChainId) {
                    throw new Error('Failed to switch to Avalanche Fuji. Please switch manually.');
                }
            }
            
            // Get contract address from config
            if (typeof config !== 'undefined' && config.blockchain && config.blockchain.avalanche) {
                this.contractAddress = config.blockchain.avalanche.contracts.zkVerifier;
            } else {
                // Fallback to deployed address on Fuji
                this.contractAddress = '0x112E448fFD99c224b6aa24746E9B34E09A8E6C46';
            }
            
            console.log('Using contract address:', this.contractAddress);
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            
            this.isConnected = true;
            return { success: true, account: this.account };
            
        } catch (error) {
            console.error('Connection error:', error);
            this.isConnected = false;
            return { success: false, error: error.message };
        }
    }
    
    async disconnect() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.isConnected = false;
    }
    
    // Convert proof data to format expected by the smart contract
    convertProofForContract(ethereumProof) {
        try {
            console.log('Converting proof for contract...');
            console.log('Input proof structure:', Object.keys(ethereumProof));
            
            // Handle different possible formats
            let publicSignals = ethereumProof.Input || ethereumProof.public_signals || ethereumProof.publicSignals;
            const { a, b, c } = ethereumProof;
            
            if (!a || !b || !c || !publicSignals) {
                throw new Error('Invalid proof format - missing required fields');
            }
            
            // Ensure all values are strings and properly formatted
            const formatValue = (val) => {
                if (typeof val === 'string') return val;
                if (typeof val === 'number') return val.toString();
                if (typeof val === 'bigint') return val.toString();
                return String(val);
            };
            
            const proof = {
                a: a.map(formatValue),
                b: b.map(arr => arr.map(formatValue)),
                c: c.map(formatValue),
                publicSignals: publicSignals.map(formatValue)
            };
            
            console.log('Formatted proof:', proof);
            return proof;
            
        } catch (error) {
            console.error('Error converting proof:', error);
            throw error;
        }
    }

    async getProofStatus(proofId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            // Convert proofId to bytes32 if needed
            const proofIdBytes32 = proofId.startsWith('0x') ? proofId : this.web3.utils.keccak256(proofId);
            
            // Call the contract to check if proof is already verified
            const isVerified = await this.contract.methods.verifiedProofs(proofIdBytes32).call();
            
            return isVerified;
        } catch (error) {
            console.error('Error checking proof status:', error);
            return false;
        }
    }
    
    async verifyProof(proofData, proofId, proofType) {
        try {
            if (!this.isConnected) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }
            
            // Double-check we're still on the right network
            try {
                const currentChainId = await this.web3.eth.getChainId();
                if (Number(currentChainId) !== 43113) {
                    console.log('Network changed, reconnecting...');
                    this.isConnected = false;
                    const reconnectResult = await this.connect();
                    if (!reconnectResult.success) {
                        throw new Error('Network changed. Please switch back to Avalanche Fuji and try again.');
                    }
                }
            } catch (networkError) {
                console.error('Network check error:', networkError);
                throw new Error('Network connection lost. Please reconnect your wallet.');
            }
            
            console.log('Starting Avalanche verification for proof:', proofId);
            
            // Check if proof is already verified
            const isAlreadyVerified = await this.getProofStatus(proofId);
            if (isAlreadyVerified) {
                console.log('Proof already verified on Avalanche');
                return {
                    success: true,
                    alreadyVerified: true,
                    message: 'Proof was already verified on Avalanche'
                };
            }
            
            // Convert proof to contract format
            const { a, b, c, publicSignals } = this.convertProofForContract(proofData);
            
            // Prepare verification transaction based on proof type
            let txData;
            const proofIdBytes32 = this.web3.utils.keccak256(proofId);
            
            if (proofType === 'prove_ai_content') {
                // For AI prediction proofs, we need to use a specific contract
                // This would need to be deployed on Avalanche
                console.log('AI prediction proof verification not yet deployed on Avalanche');
                throw new Error('AI prediction verifier not yet deployed on Avalanche Fuji testnet');
            } else {
                // Standard proof verification
                const verifyMethod = this.contract.methods.verifyProof(a, b, c, publicSignals);
                
                // First do a call to check if the proof is valid
                const isValid = await verifyMethod.call({ from: this.account });
                console.log('Proof validity check:', isValid);
                
                if (!isValid) {
                    throw new Error('Proof verification failed on Avalanche');
                }
                
                // Estimate gas
                const gasEstimate = await verifyMethod.estimateGas({ from: this.account });
                console.log('Gas estimate:', gasEstimate);
                
                // Get current gas price
                const gasPrice = await this.web3.eth.getGasPrice();
                console.log('Current gas price:', gasPrice);
                
                txData = {
                    from: this.account,
                    to: this.contractAddress,
                    data: verifyMethod.encodeABI(),
                    gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
                    gasPrice: gasPrice
                };
            }
            
            // Send the transaction
            console.log('Sending verification transaction...');
            const tx = await this.web3.eth.sendTransaction(txData);
            
            console.log('Transaction sent:', tx.transactionHash);
            
            return {
                success: true,
                txHash: tx.transactionHash,
                explorerUrl: `https://testnet.snowtrace.io/tx/${tx.transactionHash}`,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed
            };
            
        } catch (error) {
            console.error('Avalanche verification error:', error);
            return {
                success: false,
                error: error.message || 'Verification failed'
            };
        }
    }
}

// Global function to be called from blockchain-verifier.js
window.verifyOnAvalancheActual = async function(proofId, proofType) {
    console.log('verifyOnAvalancheActual called with:', proofId, proofType);
    
    try {
        // Fetch proof data from server
        const response = await fetch(`/api/proof/${proofId}/ethereum`);
        if (!response.ok) {
            // Try the integrated endpoint as fallback
            const fallbackResponse = await fetch(`/api/proof/${proofId}/ethereum-integrated`);
            if (!fallbackResponse.ok) {
                throw new Error(`Failed to fetch proof data: ${response.statusText}`);
            }
            const proofData = await fallbackResponse.json();
            console.log('Using fallback endpoint, fetched proof data:', proofData);
            
            // Create verifier instance
            const verifier = new AvalancheVerifier();
            
            // Extract the proof in the correct format
            const proofToVerify = proofData.proof || proofData;
            
            // Verify the proof
            const result = await verifier.verifyProof(proofToVerify, proofId, proofType);
            
            return result;
        }
        
        const proofData = await response.json();
        console.log('Fetched proof data:', proofData);
        
        // Create verifier instance
        const verifier = new AvalancheVerifier();
        
        // Extract the proof in the correct format
        const proofToVerify = proofData.proof || proofData;
        
        // Verify the proof
        const result = await verifier.verifyProof(proofToVerify, proofId, proofType);
        
        return result;
        
    } catch (error) {
        console.error('Error in verifyOnAvalancheActual:', error);
        return {
            success: false,
            error: error.message
        };
    }
};