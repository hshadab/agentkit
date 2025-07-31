// Base Groth16 Proof Verifier - Rebuilt based on working Ethereum implementation
// This verifier handles Groth16 proof verification on Base Sepolia

class BaseVerifier {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = null;
        this.isConnected = false;
        
        // Groth16 Verifier ABI - same as Ethereum
        this.contractABI = [
            {
                "inputs": [
                    {"internalType": "uint[2]", "name": "_pA", "type": "uint256[2]"},
                    {"internalType": "uint[2][2]", "name": "_pB", "type": "uint256[2][2]"},
                    {"internalType": "uint[2]", "name": "_pC", "type": "uint256[2]"},
                    {"internalType": "uint[6]", "name": "_pubSignals", "type": "uint256[6]"}
                ],
                "name": "verifyProof",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
    }
    
    async connect() {
        try {
            console.log('Connecting to Base...');
            
            if (!window.ethereum) {
                throw new Error('MetaMask not detected');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            console.log('Connected account:', this.account);
            
            // Initialize Web3
            this.web3 = new Web3(window.ethereum);
            
            // Check and switch to Base Sepolia
            const chainId = await this.web3.eth.getChainId();
            const expectedChainId = 84532; // Base Sepolia
            
            if (Number(chainId) !== expectedChainId) {
                console.log('Switching to Base Sepolia...');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14a34' }], // 84532 in hex
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        // Add the network
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org']
                            }],
                        });
                    } else {
                        throw switchError;
                    }
                }
            }
            
            // Set contract address
            if (typeof config !== 'undefined' && config.blockchain?.base?.contracts?.zkVerifier) {
                this.contractAddress = config.blockchain.base.contracts.zkVerifier;
            } else {
                this.contractAddress = '0x74D68B2481d298F337e62efc50724CbBA68dCF8f';
            }
            
            console.log('Using contract:', this.contractAddress);
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            this.isConnected = true;
            
            return { 
                success: true, 
                account: this.account,
                network: 'Base Sepolia',
                contractAddress: this.contractAddress
            };
            
        } catch (error) {
            console.error('Connection error:', error);
            this.isConnected = false;
            return { success: false, error: error.message };
        }
    }
    
    async verifyProof(proofId, proofType) {
        try {
            console.log('Starting Base verification for:', proofId);
            
            if (!this.isConnected) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }
            
            // Fetch proof data from API
            console.log('Fetching proof data...');
            const response = await fetch(`/api/proof/${proofId}/ethereum`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch proof: ${response.status}`);
            }
            
            const proofData = await response.json();
            console.log('Proof data received');
            
            // Extract proof components
            let proof;
            if (proofData.proof) {
                proof = proofData.proof;
            } else {
                proof = proofData;
            }
            
            // Format proof for contract
            const formattedProof = {
                a: proof.a,
                b: proof.b,
                c: proof.c
            };
            
            // Get public signals
            const pubSignals = proofData.public_signals || [];
            
            console.log('Proof components:', {
                a: formattedProof.a,
                b: formattedProof.b,
                c: formattedProof.c,
                signals: pubSignals
            });
            
            // Check for AI prediction commitment on Base
            if (proofType === 'prove_ai_content' || proofId.includes('ai_prediction')) {
                console.log('AI prediction proof detected - checking commitment contract');
                // For AI predictions, there might be additional commitment verification
                // but for now, proceed with standard verification
            }
            
            // Verify proof on-chain
            const result = await this.verifyProofOnChain(
                proofId,
                formattedProof,
                pubSignals,
                proofType
            );
            
            return result;
            
        } catch (error) {
            console.error('Base verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProofOnChain(proofId, formattedProof, pubSignals, proofType) {
        try {
            console.log('=== Starting on-chain verification ===');
            
            // First check with call()
            console.log('Checking proof validity...');
            const isValid = await this.contract.methods
                .verifyProof(
                    formattedProof.a,
                    formattedProof.b,
                    formattedProof.c,
                    pubSignals
                )
                .call({ from: this.account });
            
            console.log('Proof validity:', isValid);
            
            if (!isValid) {
                throw new Error('Proof verification failed - invalid proof');
            }
            
            // Estimate gas
            console.log('Estimating gas...');
            const gasEstimate = await this.contract.methods
                .verifyProof(
                    formattedProof.a,
                    formattedProof.b,
                    formattedProof.c,
                    pubSignals
                )
                .estimateGas({ from: this.account });
            
            console.log('Gas estimate:', gasEstimate);
            
            // Get gas price and cap it for testnet
            let gasPrice = await this.web3.eth.getGasPrice();
            console.log('Current gas price:', gasPrice, 'wei');
            
            // Cap gas price to 0.1 gwei for Base Sepolia testnet
            const maxGasPrice = this.web3.utils.toWei('0.1', 'gwei');
            if (BigInt(gasPrice) > BigInt(maxGasPrice)) {
                console.log('Capping gas price to 0.1 gwei for testnet');
                gasPrice = maxGasPrice;
            }
            
            // Send transaction
            console.log('Sending transaction with gas price:', gasPrice);
            const receipt = await this.contract.methods
                .verifyProof(
                    formattedProof.a,
                    formattedProof.b,
                    formattedProof.c,
                    pubSignals
                )
                .send({ 
                    from: this.account,
                    gas: Math.floor(Number(gasEstimate) * 1.2), // 20% buffer
                    gasPrice: gasPrice
                });
            
            console.log('Transaction successful:', receipt.transactionHash);
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                explorerUrl: `https://sepolia.basescan.org/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('On-chain verification failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.baseVerifier = new BaseVerifier();

// Global verification function
window.verifyOnBaseActual = async function(proofId, proofType) {
    return await window.baseVerifier.verifyProof(proofId, proofType);
};

console.log('[BASE] Rebuilt Groth16 verifier loaded');