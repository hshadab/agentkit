// Use global ethers from CDN
const { ethers } = window;

export class AvalancheMedicalIntegrity {
    constructor() {
        // Initialize with empty values, will be set in init()
        this.contractAddress = null;
        this.chainId = null;
        this.chainName = null;
        this.rpcUrl = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        
        // Contract ABI for medical records
        this.contractABI = [
            {
                "name": "createMedicalRecord",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    {"name": "patientId", "type": "uint256"},
                    {"name": "recordHash", "type": "bytes32"},
                    {"name": "patientAddress", "type": "address"}
                ],
                "outputs": [{"name": "recordId", "type": "bytes32"}]
            },
            {
                "name": "verifyIntegrity",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    {"name": "recordId", "type": "bytes32"},
                    {"name": "zkProof", "type": "bytes"},
                    {"name": "currentHash", "type": "bytes32"}
                ],
                "outputs": []
            },
            {
                "name": "RecordCreated",
                "type": "event",
                "anonymous": false,
                "inputs": [
                    {"name": "recordId", "type": "bytes32", "indexed": true},
                    {"name": "provider", "type": "address", "indexed": true},
                    {"name": "patient", "type": "address", "indexed": true},
                    {"name": "timestamp", "type": "uint256", "indexed": false}
                ]
            }
        ];
    }
    
    async init() {
        // Dynamically import config
        const { config } = await import('../core/config.js');
        this.contractAddress = config.blockchain.avalanche.contracts.medicalIntegrity;
        this.chainId = config.blockchain.avalanche.chainId;
        this.chainName = config.blockchain.avalanche.name;
        this.rpcUrl = config.blockchain.avalanche.rpcUrl;
    }
    
    async connect() {
        // Ensure we're initialized
        if (!this.contractAddress) {
            await this.init();
        }
        if (!window.ethereum) {
            throw new Error('MetaMask not found');
        }
        
        // Create provider (ethers v5 syntax)
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check current network
        const network = await this.provider.getNetwork();
        console.log('[AVALANCHE] Current network:', network);
        
        // Switch to Avalanche if not already on it
        if (network.chainId !== 43113 && network.chainId !== 43114) {
            console.log('[AVALANCHE] Switching to Avalanche network...');
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xa869' }], // 43113 in hex (Fuji testnet)
                });
                // Recreate provider after network switch
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
            } catch (switchError) {
                if (switchError.code === 4902) {
                    // Network not added, add it
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
                    // Recreate provider after network add
                    this.provider = new ethers.providers.Web3Provider(window.ethereum);
                } else {
                    throw switchError;
                }
            }
        }
        
        this.signer = await this.provider.getSigner();
        
        // Create contract instance
        this.contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.signer
        );
        
        return true;
    }
    
    async createMedicalRecord(patientId, recordHash, patientAddress) {
        if (!this.contract) {
            await this.connect();
        }
        
        console.log('Creating medical record on Avalanche...');
        console.log('Patient ID:', patientId);
        console.log('Record Hash:', recordHash);
        console.log('Patient Address:', patientAddress);
        
        try {
            // Ensure record hash is properly formatted
            let formattedHash = recordHash;
            if (!formattedHash.startsWith('0x')) {
                formattedHash = '0x' + formattedHash;
            }
            // Pad to 32 bytes if needed
            if (formattedHash.length < 66) {
                formattedHash = formattedHash + '0'.repeat(66 - formattedHash.length);
            }
            
            // Check if contract exists
            const code = await this.provider.getCode(this.contractAddress);
            
            if (code === '0x') {
                // Contract doesn't exist, send a data transaction instead
                console.log('Contract not deployed, sending data transaction...');
                
                // Create a transaction that stores the medical record data
                const dataPayload = ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'bytes32', 'address'],
                    [patientId, formattedHash, patientAddress || await this.signer.getAddress()]
                );
                
                const tx = await this.signer.sendTransaction({
                    to: await this.signer.getAddress(), // Send to self
                    data: dataPayload,
                    value: 0
                });
                
                console.log('Data transaction sent:', tx.hash);
                const receipt = await tx.wait();
                
                // Generate a pseudo record ID
                const recordId = ethers.utils.keccak256(
                    ethers.utils.defaultAbiCoder.encode(
                        ['uint256', 'bytes32', 'address', 'uint256'],
                        [patientId, formattedHash, await this.signer.getAddress(), receipt.blockNumber]
                    )
                );
                
                return {
                    success: true,
                    recordId: recordId,
                    txHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString()
                };
            }
            
            // Contract exists, use it normally
            const patientIdBN = ethers.BigNumber.from(patientId);
            
            const tx = await this.contract.createMedicalRecord(
                patientIdBN,
                formattedHash,
                patientAddress || await this.signer.getAddress()
            );
            
            console.log('Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transaction confirmed in block:', receipt.blockNumber);
            
            // Extract record ID from events
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'RecordCreated';
                } catch {
                    return false;
                }
            });
            
            if (event) {
                const parsedEvent = this.contract.interface.parseLog(event);
                const recordId = parsedEvent.args.recordId;
                
                return {
                    success: true,
                    recordId: recordId,
                    txHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString()
                };
            }
            
            // Fallback if no event found
            return {
                success: true,
                recordId: formattedHash,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error) {
            console.error('Error creating medical record:', error);
            throw error;
        }
    }
    
    async verifyIntegrity(recordId, zkProof, currentHash) {
        if (!this.contract) {
            await this.connect();
        }
        
        console.log('Verifying medical record integrity...');
        
        try {
            const tx = await this.contract.verifyIntegrity(
                recordId,
                zkProof,
                currentHash
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('Error verifying integrity:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const avalancheMedicalIntegrity = new AvalancheMedicalIntegrity();