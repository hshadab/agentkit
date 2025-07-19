// Base Proof Verifier Integration
// This handles the connection to Base (Coinbase L2) and proof verification on-chain

class BaseVerifier {
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
            
            // Get network ID
            const networkId = await this.web3.eth.net.getId();
            const chainId = await this.web3.eth.getChainId();
            console.log('Network ID:', networkId, 'Chain ID:', chainId);
            
            // Base network IDs
            // Base Mainnet: 8453
            // Base Sepolia (testnet): 84532
            const expectedChainId = '0x14a34'; // 84532 in hex for Base Sepolia
            
            // Check if on Base network
            if (chainId !== 84532 && chainId !== 8453) {
                console.log('Not on Base network, switching...');
                await this.switchToBase();
            }
            
            // Contract addresses by network
            const contractAddresses = {
                8453: '0x...', // Base Mainnet (not deployed yet)
                84532: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f', // Base Sepolia
                11155111: '0x09378444046d1ccb32ca2d5b44fab6634738d067', // Sepolia (for reference)
            };
            
            this.contractAddress = contractAddresses[networkId];
            
            if (!this.contractAddress) {
                console.warn(`No contract deployed on Base network ${networkId}. Contract deployment needed.`);
                throw new Error(`No contract deployed on Base network ${networkId}`);
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
            console.error('Failed to connect to Base:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async switchToBase() {
        try {
            // Try to switch to Base Sepolia testnet
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x14a34' }], // 84532 in hex
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x14a34', // 84532 in hex
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org']
                        }],
                    });
                } catch (addError) {
                    console.error('Error adding Base network:', addError);
                    throw addError;
                }
            } else {
                throw switchError;
            }
        }
    }
    
    // Wrapper method for workflow compatibility
    async verifyProof(proofId, proofType) {
        try {
            console.log('Base verifyProof called for workflow:', proofId, proofType);
            console.log('Current connection state:', {
                isConnected: this.isConnected,
                account: this.account,
                hasWeb3: !!this.web3,
                hasContract: !!this.contract,
                contractAddress: this.contractAddress
            });
            
            // If contract is not initialized but we have web3, try to initialize it
            if (this.isConnected && this.web3 && !this.contract && this.contractAddress && this.contractAddress !== '0x0000000000000000000000000000000000000000') {
                console.log('Reinitializing contract...');
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            }
            
            // Fetch proof data from backend (same endpoint as Ethereum)
            const response = await fetch(`/api/proof/${proofId}/ethereum`);
            if (!response.ok) {
                throw new Error(`Failed to fetch proof data: ${response.statusText}`);
            }
            
            const proofData = await response.json();
            console.log('Fetched proof data for Base:', proofData);
            
            // Call the actual verification method
            const result = await this.verifyProofOnChain(proofId, proofData, proofData.publicInputs, proofType);
            
            // Return in the same format as other verifiers
            return {
                success: result.success,
                transactionHash: result.transactionHash,
                explorerUrl: result.explorerUrl || `https://sepolia.basescan.org/tx/${result.transactionHash}`,
                proofId: proofId
            };
        } catch (error) {
            console.error('Base verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProofOnChain(proofId, fetchedProofData, publicInputs, proofType) {
        try {
            console.log('=== Starting Base verifyProofOnChain ===');
            console.log('ProofId:', proofId);
            console.log('ProofType:', proofType);
            console.log('IsConnected:', this.isConnected);
            
            if (!this.isConnected) {
                throw new Error('Not connected to Base. Please connect first.');
            }
            
            
            console.log('Verifying proof on Base:', proofId);
            console.log('Using fetched proof data:', fetchedProofData);
            
            // Use the fetched proof data
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
            
            // Format proof for verifier
            const formattedProof = {
                a: proof.a,
                b: proof.b,
                c: proof.c
            };
            
            // The verifier expects 6 public signals
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
            
            // Estimate gas
            console.log('Starting gas estimation...');
            let gasEstimate;
            try {
                gasEstimate = await this.contract.methods
                    .verifyProof(
                        formattedProof.a,
                        formattedProof.b,
                        formattedProof.c,
                        pubSignals
                    )
                    .estimateGas({ from: this.account });
                console.log('Estimated gas:', gasEstimate);
            } catch (gasError) {
                console.error('Gas estimation failed:', gasError);
                gasEstimate = 300000; // Default gas limit
            }
            
            // Send transaction with Base-optimized gas settings
            console.log('Sending transaction to Base...');
            
            // Base Sepolia testnet should use very low gas prices
            let baseGasPrice = await this.web3.eth.getGasPrice();
            console.log('Network gas price:', baseGasPrice, 'wei');
            
            // For Base Sepolia testnet, cap the gas price to ensure it's reasonable
            const maxTestnetGasPrice = this.web3.utils.toWei('0.1', 'gwei'); // 0.1 gwei max for testnet
            if (BigInt(baseGasPrice) > BigInt(maxTestnetGasPrice)) {
                console.log('Capping gas price for testnet to 0.1 gwei');
                baseGasPrice = maxTestnetGasPrice;
            }
            
            const receipt = await this.contract.methods
                .verifyProof(
                    formattedProof.a,
                    formattedProof.b,
                    formattedProof.c,
                    pubSignals
                )
                .send({ 
                    from: this.account,
                    gas: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
                    gasPrice: baseGasPrice // Use network's gas price
                });
            
            console.log('Transaction receipt:', receipt);
            
            // Check if verification succeeded
            if (!receipt.status) {
                throw new Error('Transaction failed - proof verification rejected');
            }
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                explorerUrl: `https://sepolia.basescan.org/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('Base on-chain verification failed:', error);
            
            // Provide specific error messages
            let errorMessage = error.message || 'Unknown error';
            
            if (error.code === 4001) {
                errorMessage = 'Transaction rejected by user';
            } else if (error.message && error.message.includes('execution reverted')) {
                errorMessage = 'Smart contract execution failed - proof verification failed';
            } else if (error.message && error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for gas on Base';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    
    onAccountChange(account) {
        console.log('Account changed:', account);
    }
}

// Initialize global instance
window.baseVerifier = new BaseVerifier();

// Expose the verification function for the blockchain verifier
window.verifyOnBaseActual = async function(proofId, proofType) {
    // Check if we need to sync connection state from blockchainVerifier
    if (window.blockchainVerifier && window.blockchainVerifier.baseConnected && !window.baseVerifier.isConnected) {
        console.log('Syncing Base connection state from blockchainVerifier');
        // Sync the connection state
        window.baseVerifier.isConnected = true;
        window.baseVerifier.account = window.blockchainVerifier.baseAccount;
        
        // Initialize Web3 with the existing provider
        if (window.ethereum) {
            window.baseVerifier.web3 = new Web3(window.ethereum);
            
            // Get network ID and set contract
            try {
                const networkId = await window.baseVerifier.web3.eth.net.getId();
                const contractAddresses = {
                    8453: '0x...', // Base Mainnet (not deployed)
                    84532: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f', // Base Sepolia
                };
                
                window.baseVerifier.contractAddress = contractAddresses[networkId];
                if (window.baseVerifier.contractAddress && window.baseVerifier.contractAddress !== '0x0000000000000000000000000000000000000000') {
                    window.baseVerifier.contract = new window.baseVerifier.web3.eth.Contract(
                        window.baseVerifier.contractABI, 
                        window.baseVerifier.contractAddress
                    );
                    console.log('Base contract initialized:', window.baseVerifier.contractAddress);
                } else {
                    console.error('No Base contract address for network:', networkId);
                }
            } catch (error) {
                console.error('Failed to sync contract setup:', error);
            }
        }
    }
    
    return await window.baseVerifier.verifyProof(proofId, proofType);
};