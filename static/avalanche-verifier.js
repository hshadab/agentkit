// Avalanche Groth16 Proof Verifier - Rebuilt based on working Ethereum implementation
// This verifier handles Groth16 proof verification on Avalanche C-Chain

class AvalancheVerifier {
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
            console.log('Connecting to Avalanche...');
            
            if (!window.ethereum) {
                throw new Error('MetaMask not detected');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            console.log('Connected account:', this.account);
            
            // Initialize Web3
            this.web3 = new Web3(window.ethereum);
            
            // Check and switch to Avalanche Fuji
            const chainId = await this.web3.eth.getChainId();
            const expectedChainId = 43113; // Avalanche Fuji
            
            if (Number(chainId) !== expectedChainId) {
                console.log('Switching to Avalanche Fuji...');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xa869' }], // 43113 in hex
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        // Add the network
                        await window.ethereum.request({
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
                    } else {
                        throw switchError;
                    }
                }
            }
            
            // Set contract address
            if (typeof config !== 'undefined' && config.blockchain?.avalanche?.contracts?.zkVerifier) {
                this.contractAddress = config.blockchain.avalanche.contracts.zkVerifier;
            } else {
                this.contractAddress = '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1';
            }
            
            console.log('Using contract:', this.contractAddress);
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            this.isConnected = true;
            
            return { 
                success: true, 
                account: this.account,
                network: 'Avalanche Fuji',
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
            console.log('Starting Avalanche verification for:', proofId);
            console.log('Current state:', {
                isConnected: this.isConnected,
                hasWeb3: !!this.web3,
                hasContract: !!this.contract,
                hasAccount: !!this.account,
                contractAddress: this.contractAddress
            });
            
            if (!this.isConnected || !this.contract || !this.web3) {
                console.log('Not properly initialized, connecting now...');
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
                console.log('Connected successfully:', {
                    account: this.account,
                    contractAddress: this.contractAddress,
                    hasContract: !!this.contract,
                    hasWeb3: !!this.web3
                });
            }
            
            // Fetch proof data from API
            console.log('Fetching proof data from:', `/api/proof/${proofId}/ethereum`);
            console.log('Proof ID:', proofId);
            
            // First check if proof exists
            try {
                const proofsResponse = await fetch('/api/proofs');
                if (proofsResponse.ok) {
                    const proofs = await proofsResponse.json();
                    console.log('Available proofs:', proofs);
                    const proofExists = proofs.some(p => p.proof_id === proofId || p === proofId);
                    console.log('Proof exists in list:', proofExists);
                }
            } catch (e) {
                console.log('Could not check proofs list');
            }
            
            const response = await fetch(`/api/proof/${proofId}/ethereum`);
            
            if (!response.ok) {
                console.error('Fetch failed:', response.status, response.statusText);
                // Log available proof IDs
                try {
                    const proofsResponse = await fetch('/api/proofs');
                    if (proofsResponse.ok) {
                        const proofs = await proofsResponse.json();
                        console.log('Available proofs:', proofs);
                    }
                } catch (e) {
                    console.error('Could not fetch proofs list:', e);
                }
                throw new Error(`Failed to fetch proof: ${response.status}`);
            }
            
            const proofData = await response.json();
            console.log('Proof data received:', proofData);
            console.log('Proof structure:', {
                hasProof: !!proofData.proof,
                hasPublicSignals: !!proofData.public_signals,
                hasPublicInputs: !!proofData.public_inputs,
                proofKeys: proofData.proof ? Object.keys(proofData.proof) : 'N/A'
            });
            
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
            
            // Get public signals - ensure we have exactly 6
            let pubSignals = proofData.public_signals || [];
            
            // If we don't have public_signals, try to construct from public_inputs
            if (!pubSignals.length && proofData.public_inputs) {
                console.log('No public_signals found, constructing from public_inputs');
                const inputs = proofData.public_inputs;
                pubSignals = [
                    inputs.commitment || "0",
                    "1", // isValid
                    inputs.commitment || "0",
                    inputs.proof_type ? inputs.proof_type.toString() : "1",
                    inputs.timestamp ? inputs.timestamp.toString() : "0",
                    "1" // verificationResult
                ];
            }
            
            console.log('Proof components:', {
                a: formattedProof.a,
                b: formattedProof.b,
                c: formattedProof.c,
                signals: pubSignals,
                signalsLength: pubSignals.length
            });
            
            // Verify proof on-chain
            const result = await this.verifyProofOnChain(
                proofId,
                formattedProof,
                pubSignals,
                proofType
            );
            
            return result;
            
        } catch (error) {
            console.error('Avalanche verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProofOnChain(proofId, formattedProof, pubSignals, proofType) {
        try {
            console.log('=== Starting on-chain verification ===');
            console.log('Account:', this.account);
            console.log('Contract:', this.contractAddress);
            console.log('Formatted proof:', formattedProof);
            console.log('Public signals:', pubSignals);
            console.log('Public signals length:', pubSignals.length);
            
            // First check with call()
            console.log('Checking proof validity...');
            console.log('Contract methods available:', Object.keys(this.contract.methods));
            
            let isValid;
            try {
                isValid = await this.contract.methods
                    .verifyProof(
                        formattedProof.a,
                        formattedProof.b,
                        formattedProof.c,
                        pubSignals
                    )
                    .call({ from: this.account });
                console.log('Call succeeded, isValid:', isValid);
            } catch (callError) {
                console.error('Call failed:', callError);
                console.error('Error details:', {
                    message: callError.message,
                    code: callError.code,
                    data: callError.data
                });
                throw callError;
            }
            
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
            
            // Send transaction
            console.log('Sending transaction...');
            const receipt = await this.contract.methods
                .verifyProof(
                    formattedProof.a,
                    formattedProof.b,
                    formattedProof.c,
                    pubSignals
                )
                .send({ 
                    from: this.account,
                    gas: Math.floor(Number(gasEstimate) * 1.2) // 20% buffer
                });
            
            console.log('Transaction successful:', receipt.transactionHash);
            
            return {
                success: true,
                txHash: receipt.transactionHash,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                explorerUrl: `https://testnet.snowtrace.io/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('On-chain verification failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.avalancheVerifier = new AvalancheVerifier();

// Global verification function
window.verifyOnAvalancheActual = async function(proofId, proofType) {
    return await window.avalancheVerifier.verifyProof(proofId, proofType);
};

console.log('[AVALANCHE] Rebuilt Groth16 verifier loaded');