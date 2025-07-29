// Official ioID Device Manager - Using IoTeX's official ioID system
// Based on: https://github.com/iotexproject/ioID-contracts
// Documentation: https://docs.iotex.io/depin-infra-modules-dim/ioid-depin-identities

class OfficialIoIDManager {
    constructor() {
        // Official ioID contract addresses on IoTeX
        this.contracts = {
            // Mainnet addresses
            mainnet: {
                Project: '0xA596800891e6a95Bf737404411ef529c1F377b4e',
                ProjectRegistry: '0x601B655c0a20FA1465C9a18e39387A33eEe7F777',
                ioIDStore: '0xa822Fd390e8eD3FEC80Bd26c77DD036935463b5E',
                ioID: '0x1FCB980eD0287777ab05ADc93012332e11300e54',
                ioIDRegistry: '0x04e4655Cf258EC802D17c23ec6112Ef7d97Fa2aF'
            },
            // Testnet addresses (these need to be confirmed from official sources)
            testnet: {
                Project: '0xA596800891e6a95Bf737404411ef529c1F377b4e', // Using mainnet for now
                ProjectRegistry: '0x601B655c0a20FA1465C9a18e39387A33eEe7F777',
                ioIDStore: '0xa822Fd390e8eD3FEC80Bd26c77DD036935463b5E',
                ioID: '0x1FCB980eD0287777ab05ADc93012332e11300e54',
                ioIDRegistry: '0x04e4655Cf258EC802D17c23ec6112Ef7d97Fa2aF'
            }
        };
        
        this.network = 'testnet'; // Default to testnet
        this.provider = null;
        this.signer = null;
        this.projectId = null; // Will be set when creating/joining a project
    }
    
    async connect() {
        if (!window.ethereum) {
            throw new Error('MetaMask not installed');
        }
        
        // Connect to MetaMask
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create ethers provider
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Ensure we're on IoTeX network
        await this.ensureIoTeXNetwork();
        
        // Determine network (mainnet vs testnet)
        const network = await this.provider.getNetwork();
        this.network = network.chainId === 4689 ? 'mainnet' : 'testnet';
        
        console.log(`Connected to IoTeX ${this.network}`);
    }
    
    async ensureIoTeXNetwork() {
        const network = await this.provider.getNetwork();
        const targetChainId = 4690; // IoTeX Testnet
        
        if (network.chainId !== targetChainId) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x1252' }], // 4690 in hex
            });
        }
    }
    
    // Get contract addresses for current network
    getContractAddresses() {
        return this.contracts[this.network];
    }
    
    // Create or join a DePIN project (required before creating device identities)
    async initializeProject(projectName = 'Verifiable Agent Kit Devices') {
        await this.connect();
        
        const addresses = this.getContractAddresses();
        
        // ProjectRegistry ABI (simplified)
        const projectRegistryABI = [
            {
                "inputs": [
                    {"name": "_name", "type": "string"},
                    {"name": "_metadata", "type": "string"}
                ],
                "name": "createProject",
                "outputs": [{"name": "projectId", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "_projectId", "type": "uint256"}],
                "name": "getProject",
                "outputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "name", "type": "string"},
                    {"name": "metadata", "type": "string"},
                    {"name": "active", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const projectRegistry = new ethers.Contract(
            addresses.ProjectRegistry,
            projectRegistryABI,
            this.signer
        );
        
        // For demo, use a hardcoded project ID or create a new one
        // In production, you'd manage project IDs properly
        this.projectId = 1; // Default project ID
        
        console.log(`Using project ID: ${this.projectId}`);
        return this.projectId;
    }
    
    // Create an ioID for a device
    async createDeviceIoID(deviceName, deviceType = 'sensor') {
        await this.connect();
        
        if (!this.projectId) {
            await this.initializeProject();
        }
        
        const addresses = this.getContractAddresses();
        
        // ioID ABI (simplified - focusing on device registration)
        const ioIDABI = [
            {
                "inputs": [
                    {"name": "_projectId", "type": "uint256"},
                    {"name": "_deviceId", "type": "bytes32"},
                    {"name": "_metadata", "type": "string"}
                ],
                "name": "createDeviceIdentity",
                "outputs": [{"name": "ioId", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "_ioId", "type": "uint256"}],
                "name": "getIdentity",
                "outputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "projectId", "type": "uint256"},
                    {"name": "deviceId", "type": "bytes32"},
                    {"name": "metadata", "type": "string"},
                    {"name": "active", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const ioIDContract = new ethers.Contract(
            addresses.ioID,
            ioIDABI,
            this.signer
        );
        
        try {
            // Generate device ID (32 bytes)
            const deviceId = ethers.utils.id(deviceName);
            
            // Create metadata
            const metadata = JSON.stringify({
                name: deviceName,
                type: deviceType,
                created: new Date().toISOString(),
                owner: await this.signer.getAddress()
            });
            
            console.log(`Creating ioID for device ${deviceName}...`);
            
            // Create device identity
            const tx = await ioIDContract.createDeviceIdentity(
                this.projectId,
                deviceId,
                metadata
            );
            
            const receipt = await tx.wait();
            
            // Extract ioID from events
            const event = receipt.events.find(e => e.event === 'DeviceIdentityCreated');
            const ioId = event ? event.args.ioId : null;
            
            console.log(`Device ioID created! ioID: ${ioId}, TX: ${receipt.transactionHash}`);
            
            return {
                success: true,
                ioId: ioId ? ioId.toString() : 'pending',
                deviceId,
                deviceName,
                metadata: JSON.parse(metadata),
                transactionHash: receipt.transactionHash,
                explorerUrl: `https://testnet.iotexscan.io/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('ioID creation error:', error);
            throw error;
        }
    }
    
    // Get device identity information
    async getDeviceIdentity(ioId) {
        await this.connect();
        
        const addresses = this.getContractAddresses();
        
        const ioIDABI = [
            {
                "inputs": [{"name": "_ioId", "type": "uint256"}],
                "name": "getIdentity",
                "outputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "projectId", "type": "uint256"},
                    {"name": "deviceId", "type": "bytes32"},
                    {"name": "metadata", "type": "string"},
                    {"name": "active", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const ioIDContract = new ethers.Contract(
            addresses.ioID,
            ioIDABI,
            this.provider
        );
        
        try {
            const identity = await ioIDContract.getIdentity(ioId);
            
            return {
                ioId,
                owner: identity.owner,
                projectId: identity.projectId.toString(),
                deviceId: identity.deviceId,
                metadata: JSON.parse(identity.metadata),
                active: identity.active
            };
        } catch (error) {
            console.error('Error fetching identity:', error);
            return null;
        }
    }
    
    // Create a DID document for the device (off-chain component)
    createDIDDocument(ioId, deviceName, owner) {
        const did = `did:io:${ioId}`;
        
        return {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/ed25519-2020/v1"
            ],
            "id": did,
            "controller": owner,
            "authentication": [{
                "id": `${did}#keys-1`,
                "type": "Ed25519VerificationKey2020",
                "controller": did,
                "publicKeyMultibase": "placeholder" // Would be actual device key
            }],
            "service": [{
                "id": `${did}#iotex`,
                "type": "IoTeXIdentity",
                "serviceEndpoint": {
                    "ioId": ioId,
                    "deviceName": deviceName,
                    "network": this.network,
                    "contracts": this.getContractAddresses()
                }
            }]
        };
    }
}

// Create global instance
window.officialIoIDManager = new OfficialIoIDManager();

// Updated device registration function using official ioID
window.registerDeviceWithOfficialIoID = async function(deviceName, deviceType = 'sensor') {
    try {
        console.log(`Registering device ${deviceName} with official ioID system...`);
        
        const result = await window.officialIoIDManager.createDeviceIoID(deviceName, deviceType);
        
        if (result.success) {
            // Create DID document
            const didDocument = window.officialIoIDManager.createDIDDocument(
                result.ioId,
                deviceName,
                result.metadata.owner
            );
            
            // Store ioID mapping
            if (!window.deviceIoIDMap) {
                window.deviceIoIDMap = new Map();
            }
            window.deviceIoIDMap.set(deviceName, {
                ioId: result.ioId,
                did: `did:io:${result.ioId}`,
                deviceId: result.deviceId,
                didDocument
            });
            
            console.log(`Device registered with ioID: ${result.ioId}`);
            console.log(`DID: did:io:${result.ioId}`);
            
            return {
                success: true,
                ...result,
                did: `did:io:${result.ioId}`,
                didDocument
            };
        }
        
        return result;
    } catch (error) {
        console.error('Official ioID registration failed:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

console.log('Official ioID Manager initialized');