/**
 * Avalanche Medical Records Integrity Verifier
 * Handles medical record creation and integrity verification on Avalanche C-Chain
 */

class AvalancheMedicalVerifier {
    constructor() {
        this.contractAddress = window.config?.blockchain?.avalanche?.contracts?.medicalIntegrity || '0x8B3a350cf5c34C9194CA85829a2df0ec3153be0f';
        this.contractABI = [
            {
                "inputs": [
                    {"name": "patientId", "type": "uint256"},
                    {"name": "recordHash", "type": "bytes32"},
                    {"name": "patientAddress", "type": "address"}
                ],
                "name": "createMedicalRecord",
                "outputs": [{"name": "recordId", "type": "bytes32"}],
                "type": "function",
                "stateMutability": "nonpayable"
            },
            {
                "inputs": [
                    {"name": "recordId", "type": "bytes32"},
                    {"name": "zkProof", "type": "bytes"},
                    {"name": "currentHash", "type": "bytes32"}
                ],
                "name": "verifyIntegrity",
                "outputs": [],
                "type": "function",
                "stateMutability": "nonpayable"
            },
            {
                "inputs": [{"name": "recordId", "type": "bytes32"}],
                "name": "getRecord",
                "outputs": [
                    {"name": "recordHash", "type": "bytes32"},
                    {"name": "creationTimestamp", "type": "uint256"},
                    {"name": "provider", "type": "address"},
                    {"name": "patient", "type": "address"},
                    {"name": "accessCount", "type": "uint256"},
                    {"name": "integrityScore", "type": "uint256"}
                ],
                "type": "function",
                "stateMutability": "view",
                "constant": true
            }
        ];
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('MetaMask not installed');
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Create ethers provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // Get current network
            const network = await this.provider.getNetwork();
            console.log('Connected to network:', network);

            // Check if on Avalanche C-Chain (chainId: 43114 mainnet, 43113 testnet)
            if (network.chainId !== 43114 && network.chainId !== 43113) {
                // Try to switch to Avalanche testnet
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xa869' }], // 43113 in hex
                    });
                } catch (switchError) {
                    // If network doesn't exist, add it
                    if (switchError.code === 4902) {
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
                                blockExplorerUrls: ['https://testnet.snowtrace.io/']
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            // Create contract instance
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            this.isInitialized = true;

            console.log('✅ Avalanche Medical Verifier initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Avalanche verifier:', error);
            throw error;
        }
    }

    async createMedicalRecord(patientId, recordHash, patientAddress) {
        await this.initialize();

        try {
            console.log('Creating medical record:', { patientId, recordHash, patientAddress });

            // Convert patient ID to number
            const patientIdNum = ethers.BigNumber.from(patientId);
            
            // Ensure record hash is bytes32
            let recordHashBytes32;
            if (recordHash.startsWith('0x')) {
                recordHashBytes32 = ethers.utils.hexZeroPad(recordHash, 32);
            } else {
                recordHashBytes32 = ethers.utils.formatBytes32String(recordHash);
            }

            // Use current address if patient address not provided
            if (!patientAddress) {
                patientAddress = await this.signer.getAddress();
            }

            // Call contract
            const tx = await this.contract.createMedicalRecord(
                patientIdNum,
                recordHashBytes32,
                patientAddress
            );

            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);

            // Extract record ID from events
            const event = receipt.events?.find(e => e.event === 'RecordCreated');
            const recordId = event?.args?.recordId || receipt.transactionHash;

            return {
                success: true,
                recordId: recordId,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Failed to create medical record:', error);
            throw error;
        }
    }

    async verifyIntegrity(proofData) {
        await this.initialize();

        try {
            console.log('Verifying medical integrity with proof:', proofData);

            // Extract parameters from proof
            const patientId = proofData.public_inputs?.[0] || proofData.patient_id;
            const recordHash = proofData.public_inputs?.[1] || proofData.record_hash;
            
            // Generate or use existing record ID
            let recordId;
            if (proofData.record_id) {
                // Ensure record ID is properly formatted as bytes32
                if (proofData.record_id.startsWith('0x')) {
                    recordId = ethers.utils.hexZeroPad(proofData.record_id, 32);
                } else {
                    // Generate a deterministic record ID from patient ID and hash
                    recordId = ethers.utils.keccak256(
                        ethers.utils.defaultAbiCoder.encode(
                            ['uint256', 'uint256'],
                            [patientId, recordHash]
                        )
                    );
                }
            } else {
                // Generate new record ID
                recordId = ethers.utils.keccak256(
                    ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'uint256', 'address'],
                        [patientId, recordHash, await this.signer.getAddress()]
                    )
                );
            }

            // Format proof for contract (placeholder for now)
            const zkProof = ethers.utils.toUtf8Bytes('MEDICAL_INTEGRITY_PROOF');

            // Current hash (same as original for integrity check)
            let currentHashBytes32;
            if (typeof recordHash === 'string' && recordHash.startsWith('0x')) {
                currentHashBytes32 = ethers.utils.hexZeroPad(recordHash, 32);
            } else {
                // Convert numeric string or number to hex
                const hashNum = ethers.BigNumber.from(recordHash.toString());
                currentHashBytes32 = ethers.utils.hexZeroPad(hashNum.toHexString(), 32);
            }

            // Call contract
            const tx = await this.contract.verifyIntegrity(
                recordId,
                zkProof,
                currentHashBytes32
            );

            console.log('Verification transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Verification confirmed:', receipt);

            // Check if integrity was verified
            const event = receipt.events?.find(e => e.event === 'IntegrityVerified');
            const integrityScore = event?.args?.integrityScore?.toNumber() || 0;

            return {
                success: true,
                verified: integrityScore > 0,
                integrityScore: integrityScore,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Failed to verify medical integrity:', error);
            throw error;
        }
    }

    async getRecord(recordId) {
        await this.initialize();

        try {
            const record = await this.contract.getRecord(recordId);
            
            return {
                recordHash: record.recordHash,
                creationTimestamp: record.creationTimestamp.toNumber(),
                provider: record.provider,
                patient: record.patient,
                accessCount: record.accessCount.toNumber(),
                integrityScore: record.integrityScore.toNumber()
            };
        } catch (error) {
            console.error('Failed to get medical record:', error);
            throw error;
        }
    }

    formatProofForContract(proofData) {
        // Format zkEngine proof for Avalanche contract
        // This is a placeholder - actual implementation would parse the proof
        return {
            patientId: proofData.public_inputs?.[0] || 0,
            recordHash: proofData.public_inputs?.[1] || 0,
            creationTimestamp: proofData.public_inputs?.[2] || 0,
            verificationTimestamp: proofData.public_inputs?.[3] || 0
        };
    }
}

// Export for use in other modules
window.AvalancheMedicalVerifier = AvalancheMedicalVerifier;