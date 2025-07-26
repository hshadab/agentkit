// IoTeX Device Proximity Verifier
// Handles device registration and proximity proof verification on IoTeX

class IoTeXDeviceVerifier {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = null;
        this.isConnected = false;
        
        // IoTeX Nova Decider contract ABI
        this.contractABI = [
            {
                "inputs": [
                    {
                        "components": [
                            {"internalType": "uint256[2]", "name": "a", "type": "uint256[2]"},
                            {"internalType": "uint256[2][2]", "name": "b", "type": "uint256[2][2]"},
                            {"internalType": "uint256[2]", "name": "c", "type": "uint256[2]"}
                        ],
                        "internalType": "struct Groth16Proof",
                        "name": "proof",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint256[32]",
                        "name": "publicInputs",
                        "type": "uint256[32]"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "deviceId",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bytes",
                        "name": "deviceSignature",
                        "type": "bytes"
                    }
                ],
                "name": "verifyDeviceProximity",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "bytes32", "name": "deviceId", "type": "bytes32"},
                    {"internalType": "address", "name": "deviceAddress", "type": "address"}
                ],
                "name": "registerDevice",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                "name": "registeredDevices",
                "outputs": [
                    {"internalType": "address", "name": "owner", "type": "address"},
                    {"internalType": "uint256", "name": "lastProofTimestamp", "type": "uint256"},
                    {"internalType": "uint256", "name": "rewardsClaimed", "type": "uint256"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "bytes32", "name": "deviceId", "type": "bytes32"}],
                "name": "claimRewards",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "bytes32", "name": "deviceId", "type": "bytes32"},
                    {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "DeviceRegistered",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "bytes32", "name": "deviceId", "type": "bytes32"},
                    {"indexed": false, "internalType": "bool", "name": "isValid", "type": "bool"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "ProximityVerified",
                "type": "event"
            }
        ];
        
        // Proximity proof configuration
        this.PROXIMITY_CENTER = { x: 5000, y: 5000 };
        this.PROXIMITY_RADIUS = 100;
    }
    
    async connect() {
        try {
            // Check for MetaMask
            if (!window.ethereum) {
                throw new Error('Please install MetaMask to use IoTeX device features');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            
            console.log('Connected to wallet:', this.account);
            
            // Initialize Web3
            this.web3 = new Web3(window.ethereum);
            
            // Check network
            const chainId = await this.web3.eth.getChainId();
            console.log('Current chain ID:', chainId);
            
            // Switch to IoTeX testnet if needed
            if (Number(chainId) !== 4690) {
                console.log('Switching to IoTeX testnet...');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x1252' }], // 4690 in hex
                    });
                } catch (switchError) {
                    // Network doesn't exist, add it
                    if (switchError.code === 4902) {
                        await this.addIoTeXNetwork();
                    } else {
                        throw new Error('Failed to switch to IoTeX testnet');
                    }
                }
            }
            
            // Get contract address from config
            if (typeof config !== 'undefined' && config.blockchain && config.blockchain.iotex) {
                this.contractAddress = config.blockchain.iotex.contracts.deviceVerifier;
            }
            
            if (!this.contractAddress) {
                console.warn('Device verifier contract not deployed on IoTeX yet');
                // For demo purposes, we'll use a placeholder
                this.contractAddress = '0x0000000000000000000000000000000000000000';
            }
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            
            this.isConnected = true;
            return { success: true, account: this.account };
            
        } catch (error) {
            console.error('IoTeX connection error:', error);
            this.isConnected = false;
            return { success: false, error: error.message };
        }
    }
    
    async addIoTeXNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x1252',
                    chainName: 'IoTeX Testnet',
                    nativeCurrency: {
                        name: 'IOTX',
                        symbol: 'IOTX',
                        decimals: 18
                    },
                    rpcUrls: ['https://babel-api.testnet.iotex.io'],
                    blockExplorerUrls: ['https://testnet.iotexscan.io']
                }],
            });
            console.log('IoTeX testnet added successfully');
        } catch (error) {
            throw new Error('Failed to add IoTeX testnet: ' + error.message);
        }
    }
    
    async registerDevice(deviceId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            console.log('Registering device:', deviceId);
            
            // Convert device ID to bytes32
            const deviceIdBytes32 = this.web3.utils.keccak256(deviceId);
            
            // For demo, simulate registration
            console.log('Device registration would happen here');
            console.log('Device ID (bytes32):', deviceIdBytes32);
            console.log('Owner:', this.account);
            
            return {
                success: true,
                deviceId: deviceId,
                deviceIdBytes32: deviceIdBytes32,
                owner: this.account,
                message: 'Device registered successfully (demo mode)'
            };
            
        } catch (error) {
            console.error('Device registration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProximity(proofData, deviceId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            console.log('Verifying device proximity for:', deviceId);
            console.log('Proximity center:', this.PROXIMITY_CENTER);
            console.log('Required radius:', this.PROXIMITY_RADIUS);
            
            // In production, this would:
            // 1. Submit the Nova proof to the contract
            // 2. Verify the device is within proximity
            // 3. Update reward eligibility
            // 4. Emit verification event
            
            // For demo, simulate verification
            const result = {
                success: true,
                deviceId: deviceId,
                withinProximity: true,
                center: this.PROXIMITY_CENTER,
                radius: this.PROXIMITY_RADIUS,
                timestamp: Date.now(),
                rewardEligible: true,
                message: 'Device proximity verified (demo mode)'
            };
            
            console.log('Proximity verification result:', result);
            
            return result;
            
        } catch (error) {
            console.error('Proximity verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async getDeviceStatus(deviceId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            // In production, query the contract for device status
            // For demo, return mock data
            return {
                deviceId: deviceId,
                isRegistered: true,
                owner: this.account,
                lastProofTimestamp: Date.now() - 3600000, // 1 hour ago
                rewardsClaimed: '10.5',
                isActive: true
            };
            
        } catch (error) {
            console.error('Error getting device status:', error);
            return null;
        }
    }
    
    async claimRewards(deviceId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            console.log('Claiming rewards for device:', deviceId);
            
            // In production, this would call the contract to claim rewards
            // For demo, simulate reward claim
            return {
                success: true,
                deviceId: deviceId,
                rewardAmount: '5.0',
                currency: 'IOTX',
                txHash: '0x' + '0'.repeat(64), // Mock tx hash
                message: 'Rewards claimed successfully (demo mode)'
            };
            
        } catch (error) {
            console.error('Reward claim error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Global function to be called from UI
window.verifyDeviceProximityOnIoTeX = async function(deviceId) {
    console.log('Starting device proximity verification on IoTeX for:', deviceId);
    
    try {
        const verifier = new IoTeXDeviceVerifier();
        
        // First ensure device is registered
        const regResult = await verifier.registerDevice(deviceId);
        if (!regResult.success) {
            throw new Error('Device registration failed: ' + regResult.error);
        }
        
        // In production, we would fetch the proof from the server
        // For demo, we'll use mock proof data
        const mockProofData = {
            proof: {
                a: ["0x1", "0x2"],
                b: [["0x3", "0x4"], ["0x5", "0x6"]],
                c: ["0x7", "0x8"]
            },
            publicInputs: new Array(32).fill("0x0")
        };
        
        // Verify proximity
        const result = await verifier.verifyProximity(mockProofData, deviceId);
        
        return result;
        
    } catch (error) {
        console.error('Error in device proximity verification:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IoTeXDeviceVerifier;
}