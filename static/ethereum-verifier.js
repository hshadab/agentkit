// Ethereum Proof Verifier Integration
// This handles the connection to Ethereum and proof verification on-chain

class EthereumVerifier {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = null;
        this.isConnected = false;
        
        // Real Groth16Verifier contract ABI
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
            // Check for wallet providers (Phantom or MetaMask)
            let provider = null;
            let walletName = '';
            
            // Only check for MetaMask
            if (window.ethereum && window.ethereum.isMetaMask) {
                provider = window.ethereum;
                walletName = 'MetaMask';
                console.log('MetaMask detected');
            }
            else if (window.ethereum) {
                // Generic ethereum provider (could be other wallets)
                provider = window.ethereum;
                walletName = 'Ethereum Wallet';
                console.log('Generic Ethereum wallet detected');
            } 
            else {
                throw new Error('No Ethereum wallet detected. Please install MetaMask.');
            }
            
            // Request account access
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            
            console.log(`Connected to ${walletName} wallet:`, this.account);
            
            // Initialize Web3
            this.web3 = new Web3(provider);
            
            // Store wallet type for later checks
            this.walletType = walletName;
            
            // Get network ID
            const networkId = await this.web3.eth.net.getId();
            const chainId = await this.web3.eth.getChainId();
            console.log('Network ID:', networkId, 'Chain ID:', chainId);
            
            
            // Contract addresses by network
            const contractAddresses = {
                1: '0x...', // Mainnet (not deployed)
                11155111: '0x09378444046d1ccb32ca2d5b44fab6634738d067', // Sepolia - UPDATE THIS!
                5: '0x...', // Goerli (not deployed)
                31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3' // Local Hardhat
            };
            
            this.contractAddress = contractAddresses[networkId];
            
            if (!this.contractAddress) {
                throw new Error(`No contract deployed on network ${networkId}. Please switch to Sepolia testnet.`);
            }
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            
            this.isConnected = true;
            
            // Listen for account changes
            provider.on('accountsChanged', (accounts) => {
                this.account = accounts[0];
                this.onAccountChange(accounts[0]);
            });
            
            // Listen for chain changes
            provider.on('chainChanged', (chainId) => {
                // Reload the page when chain changes
                window.location.reload();
            });
            
            return {
                success: true,
                account: this.account,
                network: networkId,
                contractAddress: this.contractAddress,
                wallet: walletName
            };
            
        } catch (error) {
            console.error('Failed to connect to Ethereum:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Wrapper method for workflow compatibility
    async verifyProof(proofId, proofType) {
        try {
            console.log('Ethereum verifyProof called for workflow:', proofId, proofType);
            console.log('Current connection state:', {
                isConnected: this.isConnected,
                account: this.account,
                hasWeb3: !!this.web3,
                hasContract: !!this.contract,
                contractAddress: this.contractAddress,
                hasContractABI: !!this.contractABI
            });
            
            // If contract is not initialized but we have web3 and address, try to initialize it
            if (this.isConnected && this.web3 && !this.contract && this.contractAddress) {
                console.log('Contract not initialized, attempting to create it...');
                if (!this.contractABI) {
                    console.log('contractABI is missing, recreating from constructor...');
                    const tempVerifier = new EthereumVerifier();
                    this.contractABI = tempVerifier.contractABI;
                }
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                console.log('Contract recreated:', !!this.contract);
            }
            
            // Fetch proof data from backend
            const response = await fetch(`/api/proof/${proofId}/ethereum`);
            if (!response.ok) {
                throw new Error(`Failed to fetch proof data: ${response.statusText}`);
            }
            
            const proofData = await response.json();
            console.log('Fetched Ethereum proof data:', proofData);
            
            // Call the actual verification method
            const result = await this.verifyProofOnChain(proofId, proofData, proofData.publicInputs, proofType);
            
            // Return in the same format as Solana verifier
            return {
                success: result.success,
                transactionHash: result.transactionHash,
                explorerUrl: result.explorerUrl || `https://sepolia.etherscan.io/tx/${result.transactionHash}`,
                proofId: proofId
            };
        } catch (error) {
            console.error('Ethereum verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProofOnChain(proofId, fetchedProofData, publicInputs, proofType) {
        try {
            console.log('=== Starting verifyProofOnChain ===');
            console.log('ProofId:', proofId);
            console.log('ProofType:', proofType);
            console.log('IsConnected:', this.isConnected);
            
            if (!this.isConnected) {
                throw new Error('Not connected to Ethereum. Please connect first.');
            }
            
            console.log('Verifying proof on-chain:', proofId);
            console.log('Using fetched proof data:', fetchedProofData);
            
            // Use the fetched proof data passed from UI
            console.log('Fetched proof data structure:', Object.keys(fetchedProofData));
            const proof = fetchedProofData.proof;
            const publicInputsStruct = fetchedProofData.publicInputs;
            const proofIdBytes32 = fetchedProofData.proofIdBytes32;
            
            // Validate proof structure
            if (!proof || !proof.a || !proof.b || !proof.c) {
                throw new Error('Invalid proof structure - missing a, b, or c components');
            }
            
            console.log('Proof components exist:', {
                hasA: !!proof.a,
                hasB: !!proof.b,
                hasC: !!proof.c,
                aLength: proof.a?.length,
                bLength: proof.b?.length,
                cLength: proof.c?.length
            });
            
            // For real Groth16 verifier, we need to format the inputs correctly
            const formattedProof = {
                a: proof.a,
                b: proof.b,
                c: proof.c
            };
            
            // The real verifier expects 6 public signals from our circuit
            const pubSignals = fetchedProofData.public_signals || [
                publicInputsStruct.commitment,
                "1", // isValid
                publicInputsStruct.commitment,
                publicInputsStruct.proof_type ? publicInputsStruct.proof_type.toString() : "1",
                publicInputsStruct.timestamp.toString(),
                "1" // verificationResult
            ];
            
            console.log('Formatted proof:', formattedProof);
            console.log('Public signals:', pubSignals);
            
            // Check contract state before gas estimation
            console.log('=== Pre-verification checks ===');
            console.log('Contract exists:', !!this.contract);
            console.log('Contract address:', this.contract?.options?.address || this.contractAddress);
            console.log('Account:', this.account);
            console.log('Web3 provider:', !!this.web3.currentProvider);
            
            // Double-check contract initialization
            if (!this.contract) {
                console.error('Contract is null, attempting to reinitialize...');
                if (this.contractAddress && this.web3) {
                    if (!this.contractABI) {
                        const tempVerifier = new EthereumVerifier();
                        this.contractABI = tempVerifier.contractABI;
                    }
                    this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                    console.log('Contract reinitialized:', !!this.contract);
                } else {
                    throw new Error('Cannot initialize contract: missing address or web3');
                }
            }
            
            
            // Estimate gas for real verification
            console.log('Starting gas estimation at', new Date().toISOString());
            let gasEstimate;
            try {
                // Add timeout for gas estimation
                const gasEstimatePromise = this.contract.methods
                    .verifyProof(
                        formattedProof.a,
                        formattedProof.b,
                        formattedProof.c,
                        pubSignals
                    )
                    .estimateGas({ from: this.account });
                
                const gasTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gas estimation timeout after 30 seconds')), 30000)
                );
                
                gasEstimate = await Promise.race([gasEstimatePromise, gasTimeoutPromise]);
                console.log('Gas estimation completed at', new Date().toISOString());
                console.log('Estimated gas:', gasEstimate);
            } catch (gasError) {
                console.error('Gas estimation failed:', gasError);
                // Use a default gas limit if estimation fails
                gasEstimate = 300000;
                console.log('Using default gas:', gasEstimate);
            }
            
            // Send transaction for real cryptographic verification
            console.log('Sending transaction with params:');
            console.log('From:', this.account);
            console.log('Gas:', Math.floor(Number(gasEstimate) * 1.2));
            console.log('Contract address:', this.contract.options.address);
            
            // Standard Web3.js method
            let transactionSent = false;
            let confirmationCount = 0;
            
            const transactionPromise = this.contract.methods
                    .verifyProof(
                        formattedProof.a,
                        formattedProof.b,
                        formattedProof.c,
                        pubSignals
                    )
                    .send({ 
                        from: this.account,
                        gas: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer
                    });
            
            transactionPromise
                .on('transactionHash', (hash) => {
                    console.log('Transaction hash received:', hash);
                    transactionSent = true;
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    confirmationCount++;
                    // Only log first 3 confirmations
                    if (confirmationCount <= 3) {
                        console.log('Confirmation number:', confirmationNumber);
                    }
                    // Stop listening after 3 confirmations
                    if (confirmationCount >= 3) {
                        transactionPromise.off('confirmation');
                    }
                })
                .on('error', (error) => {
                    console.error('Transaction error:', error);
                    if (!transactionSent) {
                        console.error('Transaction failed before being sent');
                    }
                });
            
            const receipt = await transactionPromise;
            
            console.log('Transaction receipt:', receipt);
            
            // Get proof hash from events (if available)
            const proofHash = receipt.events?.ProofVerified?.returnValues?.proofId || null;
            
            // Check if verification actually succeeded
            if (!receipt.status) {
                throw new Error('Transaction failed - proof verification rejected');
            }
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                proofHash: proofHash,
                gasUsed: receipt.gasUsed,
                explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('On-chain verification failed:', error);
            
            // Provide more specific error messages
            let errorMessage = error.message || 'Unknown error';
            
            if (error.code === 4001) {
                errorMessage = 'Transaction rejected by user';
            } else if (error.message && error.message.includes('execution reverted')) {
                errorMessage = 'Smart contract execution failed - the proof format may not be compatible with the verifier';
            } else if (error.message && error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for gas';
            } else if (error.message && error.message.includes('nonce too low')) {
                errorMessage = 'Transaction nonce issue - please refresh and try again';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    
    async getProofStatus(proofHash) {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to Ethereum.');
            }
            
            const result = await this.contract.methods.getProofStatus(proofHash).call();
            
            return {
                isVerified: result.isVerified,
                isValid: result.isValid,
                proofType: result.proofType,
                timestamp: new Date(result.timestamp * 1000)
            };
            
        } catch (error) {
            console.error('Failed to get proof status:', error);
            return null;
        }
    }
    
    getEtherscanUrl(txHash) {
        // Since we're always using Sepolia in this demo, return Sepolia URL
        // The network ID detection was failing because getId() is async
        return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    
    onAccountChange(account) {
        // Override this method to handle account changes
        console.log('Account changed:', account);
    }
    
    async fetchProofData(proofId, onProgress) {
        try {
            console.log('Starting SNARK generation for proof:', proofId);
            
            // Call progress callback if provided
            if (onProgress) {
                onProgress('Starting SNARK generation...');
            }
            
            // Add longer timeout for SNARK generation (3 minutes)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout
            
            // Start progress updates
            let progressInterval;
            if (onProgress) {
                let elapsed = 0;
                progressInterval = setInterval(() => {
                    elapsed += 5;
                    if (elapsed < 15) {
                        onProgress(`Generating SNARK proof... (${elapsed}s elapsed)`);
                    } else if (elapsed < 30) {
                        onProgress(`Computing cryptographic constraints... (${elapsed}s elapsed)`);
                    } else {
                        onProgress(`Finalizing proof generation... (${elapsed}s elapsed)`);
                    }
                }, 5000);
            }
            
            const response = await fetch(`/api/proof/${proofId}/ethereum-integrated`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            if (progressInterval) clearInterval(progressInterval);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Proof fetch failed:', errorText);
                throw new Error(`Failed to fetch proof data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Fetched real proof data:', data);
            
            // Validate the data - the integrated endpoint returns public_signals directly
            if (!data.proof || !data.public_signals) {
                throw new Error('Invalid proof data received');
            }
            
            // Map the data to the expected format
            return {
                proof: data.proof,
                publicInputs: data.public_inputs || {}, // May not be present in integrated response
                proofIdBytes32: data.proof_id_bytes32,
                public_signals: data.public_signals
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Proof fetch timed out after 180 seconds');
                throw new Error('Request timed out - SNARK generation exceeded 3 minutes. Please try again.');
            }
            console.error('Failed to fetch proof data:', error);
            throw error;
        }
    }
    
    formatProofForChain(proofPath) {
        // Deprecated - use fetchProofData instead
        return {
            proofData: '0x' + '00'.repeat(128),
            publicInputs: '0x' + '00'.repeat(32),
        };
    }
}

// Initialize global instance
window.ethereumVerifier = new EthereumVerifier();

// Expose the verification function for the blockchain verifier
window.verifyOnEthereumActual = async function(proofId, proofType) {
    // Check if we need to sync connection state from blockchainVerifier
    if (window.blockchainVerifier && window.blockchainVerifier.ethereumConnected && !window.ethereumVerifier.isConnected) {
        console.log('Syncing Ethereum connection state from blockchainVerifier');
        // Sync the connection state
        window.ethereumVerifier.isConnected = true;
        window.ethereumVerifier.account = window.blockchainVerifier.ethereumAccount;
        
        // Initialize Web3 with the existing provider
        if (window.ethereum) {
            window.ethereumVerifier.web3 = new Web3(window.ethereum);
            
            // Get network ID and set contract
            try {
                const networkId = await window.ethereumVerifier.web3.eth.net.getId();
                const contractAddresses = {
                    11155111: '0x09378444046d1ccb32ca2d5b44fab6634738d067', // Sepolia
                    31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3' // Local Hardhat
                };
                
                window.ethereumVerifier.contractAddress = contractAddresses[networkId];
                if (window.ethereumVerifier.contractAddress) {
                    // Create a new instance of EthereumVerifier to get the contractABI
                    const tempVerifier = new EthereumVerifier();
                    window.ethereumVerifier.contractABI = tempVerifier.contractABI;
                    
                    window.ethereumVerifier.contract = new window.ethereumVerifier.web3.eth.Contract(
                        window.ethereumVerifier.contractABI, 
                        window.ethereumVerifier.contractAddress
                    );
                    console.log('Ethereum contract initialized:', window.ethereumVerifier.contractAddress);
                    console.log('Contract exists after sync:', !!window.ethereumVerifier.contract);
                } else {
                    console.error('No Ethereum contract address for network:', networkId);
                }
            } catch (error) {
                console.error('Failed to sync contract setup:', error);
            }
        }
    }
    
    return await window.ethereumVerifier.verifyProof(proofId, proofType);
};
// Cache bust: 1752933400
