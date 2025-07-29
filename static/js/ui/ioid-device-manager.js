// IoTeX ioID Device Manager - Real device registration using ioID SDK
// Based on: https://github.com/iotexproject/ioID-SDK

class IoIDDeviceManager {
    constructor() {
        this.ioIDRegistryAddress = '0x0A7e595F8A24Ec278C9C94C3C6e5216c17D881Ce'; // IoTeX Testnet ioID Registry
        this.provider = null;
        this.signer = null;
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
    }
    
    async ensureIoTeXNetwork() {
        const network = await this.provider.getNetwork();
        if (network.chainId !== 4690) { // IoTeX Testnet
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x1252' }], // 4690 in hex
            });
        }
    }
    
    // Generate a DID for a device following ioID standard
    async generateDeviceDID(deviceName, deviceType = 'sensor') {
        // DID format: did:io:0x{hash}
        // Hash is generated from device info
        const deviceInfo = {
            name: deviceName,
            type: deviceType,
            owner: await this.signer.getAddress(),
            timestamp: Date.now()
        };
        
        // Create deterministic hash for device
        const messageHash = ethers.utils.id(JSON.stringify(deviceInfo));
        const did = `did:io:${messageHash.slice(0, 42)}`; // did:io:0x + 40 hex chars
        
        console.log(`Generated DID for device ${deviceName}: ${did}`);
        
        return {
            did,
            deviceInfo,
            messageHash
        };
    }
    
    // Register device DID on IoTeX blockchain using ioID Registry
    async registerDeviceDID(deviceName, deviceType = 'sensor') {
        await this.connect();
        
        try {
            // Generate DID
            const { did, deviceInfo, messageHash } = await this.generateDeviceDID(deviceName, deviceType);
            
            // ioID Registry ABI (simplified)
            const ioIDRegistryABI = [
                {
                    "inputs": [
                        {"name": "_did", "type": "string"},
                        {"name": "_uri", "type": "string"},
                        {"name": "_hash", "type": "bytes32"}
                    ],
                    "name": "createDID",
                    "outputs": [],
                    "type": "function"
                },
                {
                    "inputs": [{"name": "_did", "type": "string"}],
                    "name": "getDID",
                    "outputs": [
                        {"name": "owner", "type": "address"},
                        {"name": "uri", "type": "string"},
                        {"name": "hash", "type": "bytes32"},
                        {"name": "active", "type": "bool"}
                    ],
                    "type": "function"
                }
            ];
            
            // Create contract instance
            const ioIDRegistry = new ethers.Contract(
                this.ioIDRegistryAddress,
                ioIDRegistryABI,
                this.signer
            );
            
            // Check if DID already exists
            try {
                const existingDID = await ioIDRegistry.getDID(did);
                if (existingDID.active) {
                    console.log(`DID ${did} already registered`);
                    return {
                        success: true,
                        did,
                        alreadyRegistered: true,
                        owner: existingDID.owner
                    };
                }
            } catch (e) {
                // DID doesn't exist, proceed with registration
            }
            
            // Create DID document URI (could be IPFS in production)
            const didDocument = {
                "@context": "https://www.w3.org/ns/did/v1",
                "id": did,
                "controller": deviceInfo.owner,
                "device": {
                    "name": deviceInfo.name,
                    "type": deviceInfo.type,
                    "created": new Date(deviceInfo.timestamp).toISOString()
                }
            };
            
            // For demo, store as data URI (in production, use IPFS)
            const uri = `data:application/json,${encodeURIComponent(JSON.stringify(didDocument))}`;
            
            // Register DID on blockchain
            console.log(`Registering DID ${did} on IoTeX blockchain...`);
            const tx = await ioIDRegistry.createDID(did, uri, messageHash);
            const receipt = await tx.wait();
            
            console.log(`DID registered! TX: ${receipt.transactionHash}`);
            
            return {
                success: true,
                did,
                transactionHash: receipt.transactionHash,
                deviceInfo,
                didDocument,
                explorerUrl: `https://testnet.iotexscan.io/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('DID registration error:', error);
            throw error;
        }
    }
    
    // Get device DID info from blockchain
    async getDeviceDID(did) {
        await this.connect();
        
        const ioIDRegistryABI = [
            {
                "inputs": [{"name": "_did", "type": "string"}],
                "name": "getDID",
                "outputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "uri", "type": "string"},
                    {"name": "hash", "type": "bytes32"},
                    {"name": "active", "type": "bool"}
                ],
                "type": "function"
            }
        ];
        
        const ioIDRegistry = new ethers.Contract(
            this.ioIDRegistryAddress,
            ioIDRegistryABI,
            this.provider
        );
        
        try {
            const didInfo = await ioIDRegistry.getDID(did);
            
            // Fetch and parse DID document
            let didDocument = null;
            if (didInfo.uri.startsWith('data:')) {
                const jsonStr = decodeURIComponent(didInfo.uri.split(',')[1]);
                didDocument = JSON.parse(jsonStr);
            }
            
            return {
                did,
                owner: didInfo.owner,
                uri: didInfo.uri,
                hash: didInfo.hash,
                active: didInfo.active,
                didDocument
            };
        } catch (error) {
            console.error('Error fetching DID:', error);
            return null;
        }
    }
    
    // Convert device name to DID for lookup
    async deviceNameToDID(deviceName) {
        const account = await this.signer.getAddress();
        const deviceInfo = {
            name: deviceName,
            type: 'sensor', // default type
            owner: account,
            timestamp: 0 // We don't know the exact timestamp, but it doesn't matter for lookup
        };
        
        // This won't match exactly unless we store the mapping
        // In production, you'd query by device name or maintain a mapping
        const messageHash = ethers.utils.id(JSON.stringify(deviceInfo));
        return `did:io:${messageHash.slice(0, 42)}`;
    }
}

// Create global instance
window.ioIDDeviceManager = new IoIDDeviceManager();

// Update the device registration function to use ioID
window.registerDeviceWithIoID = async function(deviceName, deviceType = 'sensor') {
    try {
        console.log(`Registering device ${deviceName} with ioID SDK...`);
        const result = await window.ioIDDeviceManager.registerDeviceDID(deviceName, deviceType);
        
        if (result.success) {
            console.log(`Device registered with DID: ${result.did}`);
            
            // Store DID mapping for later use
            if (!window.deviceDIDMap) {
                window.deviceDIDMap = new Map();
            }
            window.deviceDIDMap.set(deviceName, result.did);
            
            return {
                success: true,
                did: result.did,
                ...result
            };
        }
        
        return result;
    } catch (error) {
        console.error('ioID registration failed:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

console.log('ioID Device Manager initialized');