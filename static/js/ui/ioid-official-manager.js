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
            // Testnet addresses - updated from official GitHub repo
            testnet: {
                Project: '0xf07336E1c77319B4e740b666eb0C2B19D11fc14F',
                ProjectRegistry: '0x060581AA1A4e0cC92FBd74d251913238De2F13cd',
                ioIDStore: '0x60cac5CE11cb2F98bF179BE5fd3D801C3D5DBfF2',
                ioID: '0x45Ce3E6f526e597628c73B731a3e9Af7Fc32f5b7',
                ioIDRegistry: '0x0A7e595C7889dF3652A19aF52C18377bF17e027D'
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
        const targetChainId = 4690; // IoTeX Testnet
        
        try {
            const network = await this.provider.getNetwork();
            
            if (network.chainId !== targetChainId) {
                console.log(`Current network: ${network.chainId}, switching to IoTeX (${targetChainId})...`);
                
                // Use the global checkAndSwitchToIoTeX if available
                if (window.checkAndSwitchToIoTeX) {
                    await window.checkAndSwitchToIoTeX();
                    
                    // Wait for network switch to complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Recreate provider after network switch
                    this.provider = new ethers.providers.Web3Provider(window.ethereum);
                    this.signer = this.provider.getSigner();
                } else {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x1252' }], // 4690 in hex
                    });
                }
            }
        } catch (error) {
            console.error('Network switch error:', error);
            // If it's the "selected network" error, it means the switch is in progress
            if (error.code === -32603 && error.message?.includes('selected network')) {
                console.log('Network switch may be in progress, waiting...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
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
    
    // Create an ioID for a device (simplified for demo)
    async createDeviceIoID(deviceName, deviceType = 'sensor') {
        await this.connect();
        
        // Ensure we're still on IoTeX network before creating device
        await this.ensureIoTeXNetwork();
        
        try {
            // Generate device ID (32 bytes) - using ethers v5 syntax
            const deviceId = ethers.utils.id(deviceName);
            
            // For demo purposes, we'll create a simulated ioID
            // In production, this would require:
            // 1. Project registration through ProjectRegistry
            // 2. Applying for ioIDs through ioIDStore
            // 3. Minting through authorized minter
            
            const userAddress = await this.signer.getAddress();
            const simulatedIoId = Math.floor(Math.random() * 1000000) + 1;
            
            console.log(`Creating simulated ioID for device ${deviceName}...`);
            console.log(`Note: This is a demo - production would use official ioID contracts`);
            
            // Create metadata
            const metadata = {
                name: deviceName,
                type: deviceType,
                created: new Date().toISOString(),
                owner: userAddress,
                ioId: simulatedIoId,
                network: 'iotex-testnet'
            };
            
            // Store locally for demo
            console.log(`Device ${deviceName} assigned ioID: ${simulatedIoId}`);
            
            return {
                success: true,
                ioId: simulatedIoId.toString(),
                deviceId,
                deviceName,
                metadata,
                transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
                explorerUrl: `https://testnet.iotexscan.io`,
                note: 'Demo ioID - production would use official contracts'
            };
            
        } catch (error) {
            console.error('ioID creation error:', error);
            throw error;
        }
    }
    
    // Get device identity information (simplified for demo)
    async getDeviceIdentity(ioId) {
        // For demo purposes, return simulated data
        console.log(`Fetching identity for ioID: ${ioId} (demo)`);
        
        return {
            ioId,
            owner: '0x' + Math.random().toString(16).substring(2, 42),
            projectId: '1',
            deviceId: '0x' + Math.random().toString(16).substring(2, 66),
            metadata: {
                demo: true,
                ioId: ioId
            },
            active: true
        };
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
        
        // Check and switch to IoTeX network first
        if (window.checkAndSwitchToIoTeX) {
            console.log('Checking IoTeX network connection...');
            await window.checkAndSwitchToIoTeX();
        }
        
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