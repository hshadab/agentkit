// IoTeX Device Verifier - Handles IoTeX device proximity verification with Nova proofs
// This file is loaded as a regular script, so we use global functions

// Use global debugLog function if available, otherwise use console.log
const debugLog = window.debugLog || function(message, level) {
    console.log(`[${level || 'info'}] ${message}`);
};

// Get config from window (will be set by main.js module)
const config = window.config || {
    blockchain: {
        iotex: {
            chainId: '0x1252',
            contracts: {
                deviceVerifier: '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d'
            },
            explorerUrl: 'https://testnet.iotexscan.io'
        }
    }
};

// IoTeXDeviceVerifierV2 ABI (only the functions we need)
const DEVICE_VERIFIER_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "deviceId", "type": "bytes32"}, {"internalType": "address", "name": "owner", "type": "address"}],
        "name": "registerDevice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256[3]", "name": "i_z0_zi", "type": "uint256[3]"},
            {"internalType": "uint256[4]", "name": "U_i_cmW_U_i_cmE", "type": "uint256[4]"},
            {"internalType": "uint256[2]", "name": "u_i_cmW", "type": "uint256[2]"},
            {"internalType": "uint256[3]", "name": "cmT_r", "type": "uint256[3]"},
            {"internalType": "uint256[2]", "name": "pA", "type": "uint256[2]"},
            {"internalType": "uint256[2][2]", "name": "pB", "type": "uint256[2][2]"},
            {"internalType": "uint256[2]", "name": "pC", "type": "uint256[2]"},
            {"internalType": "uint256[4]", "name": "challenge_W_challenge_E_kzg_evals", "type": "uint256[4]"},
            {"internalType": "uint256[2][2]", "name": "kzg_proof", "type": "uint256[2][2]"},
            {"internalType": "bytes32", "name": "deviceId", "type": "bytes32"},
            {"internalType": "uint256", "name": "proofId", "type": "uint256"}
        ],
        "name": "verifyDeviceProximity",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
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
        "inputs": [{"internalType": "bytes32", "name": "deviceId", "type": "bytes32"}],
        "name": "getDeviceInfo",
        "outputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "bool", "name": "registered", "type": "bool"},
            {"internalType": "uint256", "name": "registrationTime", "type": "uint256"},
            {"internalType": "uint256", "name": "lastProximityProof", "type": "uint256"},
            {"internalType": "uint256", "name": "pendingRewards", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

class IoTeXDeviceVerifier {
    constructor() {
        this.contract = null;
        this.provider = null;
        this.signer = null;
        this.account = null;
        this.formatter = new window.NovaProofFormatter();
    }
    
    async connect() {
        if (!window.ethereum) {
            throw new Error('MetaMask not installed');
        }
        
        // Connect to MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.account = accounts[0];
        
        // Create Web3 provider
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Check current network first - but use the shared network switch function if available
        try {
            const network = await this.provider.getNetwork();
            if (network.chainId !== config.blockchain.iotex.chainIdDecimal) {
                // Use the global checkAndSwitchToIoTeX if available
                if (window.checkAndSwitchToIoTeX) {
                    await window.checkAndSwitchToIoTeX();
                } else {
                    await this.switchToIoTeX();
                }
            } else {
                debugLog('Already on IoTeX network', 'info');
            }
        } catch (error) {
            debugLog(`Network check error: ${error.message}`, 'warning');
            // Try to continue anyway
        }
        
        // Create contract instance
        this.contract = new ethers.Contract(
            config.blockchain.iotex.contracts.deviceVerifier,
            DEVICE_VERIFIER_ABI,
            this.signer
        );
        
        debugLog(`Connected to IoTeX Device Verifier V2 at ${config.blockchain.iotex.contracts.deviceVerifier}`, 'success');
    }
    
    async switchToIoTeX() {
        try {
            debugLog('Automatically switching to IoTeX network...', 'info');
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: config.blockchain.iotex.chainId }],
            });
            debugLog('Successfully switched to IoTeX network', 'success');
        } catch (switchError) {
            if (switchError.code === 4902) {
                debugLog('IoTeX network not found in MetaMask, adding it...', 'info');
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: config.blockchain.iotex.chainId,
                            chainName: config.blockchain.iotex.name,
                            nativeCurrency: config.blockchain.iotex.nativeCurrency,
                            rpcUrls: [config.blockchain.iotex.rpcUrl],
                            blockExplorerUrls: [config.blockchain.iotex.explorerUrl]
                        }],
                    });
                    debugLog('IoTeX network added and switched successfully', 'success');
                } catch (addError) {
                    debugLog('Failed to add IoTeX network', 'error');
                    throw addError;
                }
            } else if (switchError.code === 4001) {
                debugLog('User rejected network switch', 'warning');
                throw new Error('Please switch to IoTeX network to continue');
            } else if (switchError.code === -32603 && switchError.message?.includes('selected network')) {
                // This error occurs when network was already switched or is in process
                debugLog('Network switch may already be in progress', 'info');
                // Wait a bit and check again
                await new Promise(resolve => setTimeout(resolve, 1000));
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const network = await provider.getNetwork();
                if (network.chainId === config.blockchain.iotex.chainIdDecimal) {
                    debugLog('Successfully on IoTeX network', 'success');
                    return;
                }
                throw switchError;
            } else {
                throw switchError;
            }
        }
    }
    
    // Convert device ID to bytes32
    async deviceIdToBytes32(deviceId) {
        // Use the formatter's method
        return await this.formatter.deviceIdToBytes32(deviceId);
    }
    
    // Register a device using ioID SDK
    async registerDevice(deviceId, deviceType = 'sensor') {
        debugLog(`Registering device ${deviceId} with ioID SDK...`, 'info');
        
        // Use the official ioID SDK for real device registration
        if (window.officialIoIDManager) {
            try {
                // Register with official ioID to get a real ioID
                const ioIDResult = await window.registerDeviceWithOfficialIoID(deviceId, deviceType);
                
                if (!ioIDResult.success) {
                    throw new Error(ioIDResult.error || 'ioID registration failed');
                }
                
                debugLog(`Device registered with ioID: ${ioIDResult.ioId}, DID: ${ioIDResult.did}`, 'success');
                
                // Now register the ioID with our proximity verifier contract
                try {
                    if (!this.contract) await this.connect();
                } catch (connectError) {
                    // If network error, wait and retry once
                    if (connectError.code === -32603 || connectError.message?.includes('network')) {
                        debugLog('Network error during connect, retrying...', 'warning');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await this.connect();
                    } else {
                        throw connectError;
                    }
                }
                
                // Use the device ID from ioID for consistency
                const deviceIdBytes32 = ioIDResult.deviceId;
                
                // Register device with proximity verifier
                const tx = await this.contract.registerDevice(deviceIdBytes32, this.account, {
                    gasLimit: 500000 // Increased gas limit for registration
                });
                const receipt = await tx.wait();
                
                debugLog(`ioID linked to proximity verifier! TX: ${receipt.transactionHash}`, 'success');
                
                return {
                    success: true,
                    ioId: ioIDResult.ioId,
                    did: ioIDResult.did,
                    deviceId: deviceId,
                    deviceIdBytes32: deviceIdBytes32,
                    ioIDTxHash: ioIDResult.transactionHash,
                    verifierTxHash: receipt.transactionHash,
                    explorerUrl: `${config.blockchain.iotex.explorerUrl}/tx/${receipt.transactionHash}`
                };
                
            } catch (error) {
                debugLog(`ioID registration error: ${error.message}`, 'error');
                // Check if it's a network error
                if (error.code === -32603 && error.message?.includes('network')) {
                    return { success: false, error: 'Network switch in progress. Please try again in a moment.' };
                }
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to old method if ioID not available
            debugLog('Warning: ioID SDK not loaded, using legacy registration', 'warning');
            
            if (!this.contract) await this.connect();
            
            try {
                const deviceIdBytes32 = await this.deviceIdToBytes32(deviceId);
                
                // Check if already registered
                const deviceInfo = await this.contract.getDeviceInfo(deviceIdBytes32);
                if (deviceInfo.registered) {
                    debugLog(`Device ${deviceId} already registered`, 'info');
                    return { success: true, alreadyRegistered: true };
                }
                
                // Register the device
                const tx = await this.contract.registerDevice(deviceIdBytes32, this.account, {
                    gasLimit: 500000 // Increased gas limit for registration
                });
                debugLog(`Registering device ${deviceId}...`, 'info');
                
                const receipt = await tx.wait();
                debugLog(`Device registered! TX: ${receipt.transactionHash}`, 'success');
                
                return {
                    success: true,
                    txHash: receipt.transactionHash,
                    explorerUrl: `${config.blockchain.iotex.explorerUrl}/tx/${receipt.transactionHash}`
                };
            } catch (error) {
                debugLog(`Device registration error: ${error.message}`, 'error');
                return { success: false, error: error.message };
            }
        }
    }
    
    // Verify device proximity with Nova proof
    async verifyDeviceProximity(deviceId, x, y, proofData) {
        // Skip network check during verification - assume already on correct network
        if (!this.contract) {
            // Create contract instance without network switch
            if (!window.ethereum) {
                throw new Error('MetaMask not installed');
            }
            
            // Get accounts if not already connected
            if (!this.account) {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = accounts[0];
            }
            
            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            
            // Create contract instance without checking network
            this.contract = new ethers.Contract(
                config.blockchain.iotex.contracts.deviceVerifier,
                DEVICE_VERIFIER_ABI,
                this.signer
            );
        }
        
        // Check if we have an ioID for this device
        let deviceIdentifier;
        if (window.deviceIoIDMap && window.deviceIoIDMap.has(deviceId)) {
            // Use the device ID from ioID registration
            const ioIDInfo = window.deviceIoIDMap.get(deviceId);
            deviceIdentifier = ioIDInfo.deviceId; // This is already bytes32
            debugLog(`Using ioID ${ioIDInfo.ioId} (DID: ${ioIDInfo.did}) for device ${deviceId}`, 'info');
            console.log('Using ioID device identifier:', deviceIdentifier);
        } else {
            // Fallback to device ID hash
            deviceIdentifier = await this.deviceIdToBytes32(deviceId);
            debugLog(`Using device ID hash for ${deviceId} (no ioID found)`, 'warning');
            console.log('Using hashed device identifier:', deviceIdentifier);
        }
        
        // Check if device is registered
        try {
            const deviceInfo = await this.contract.getDeviceInfo(deviceIdentifier);
            console.log('Device registration status:', {
                deviceId: deviceId,
                identifier: deviceIdentifier,
                registered: deviceInfo.registered,
                owner: deviceInfo.owner
            });
        } catch (e) {
            console.log('Could not check device registration:', e.message);
        }
        
        try {
            // Format the proof for Nova Decider
            const novaProof = this.formatter.formatDeviceProximityProof(deviceId, x, y, proofData);
            
            // Comprehensive debug logging
            console.log('=== NOVA PROOF VERIFICATION DEBUG ===');
            console.log('1. Input Data:', {
                deviceId: deviceId,
                coordinates: { x, y },
                hasProofData: !!proofData,
                proofDataLength: proofData?.proof_data?.length,
                publicInputs: proofData?.public_inputs
            });
            
            // Log the formatted proof structure
            console.log('2. Proof Structure:', {
                i_z0_zi: novaProof.i_z0_zi,
                proofComponents: {
                    U_i_cmW_U_i_cmE_length: novaProof.U_i_cmW_U_i_cmE.length,
                    u_i_cmW_length: novaProof.u_i_cmW.length,
                    cmT_r_length: novaProof.cmT_r.length,
                    pA_length: novaProof.pA.length,
                    pB_shape: `${novaProof.pB.length}x${novaProof.pB[0]?.length}`,
                    pC_length: novaProof.pC.length,
                    challenge_length: novaProof.challenge_W_challenge_E_kzg_evals.length,
                    kzg_proof_shape: `${novaProof.kzg_proof.length}x${novaProof.kzg_proof[0]?.length}`
                }
            });
            
            // Log sample values from each component
            console.log('3. Sample Values:', {
                i_z0_zi_first: novaProof.i_z0_zi[0],
                U_i_cmW_U_i_cmE_first: novaProof.U_i_cmW_U_i_cmE[0],
                pA_first: novaProof.pA[0],
                pB_00: novaProof.pB[0][0],
                challenge_first: novaProof.challenge_W_challenge_E_kzg_evals[0]
            });
            
            // Validate all components are properly formatted
            const validateComponent = (name, component, expectedLength) => {
                if (!Array.isArray(component)) {
                    console.error(`❌ ${name} is not an array`);
                    return false;
                }
                if (component.length !== expectedLength) {
                    console.error(`❌ ${name} has wrong length: ${component.length} (expected ${expectedLength})`);
                    return false;
                }
                const allValid = component.every(val => 
                    typeof val === 'string' && 
                    /^0x[0-9a-fA-F]{64}$/.test(val)
                );
                if (!allValid) {
                    console.error(`❌ ${name} contains invalid hex values`);
                    return false;
                }
                console.log(`✓ ${name} validated`);
                return true;
            };
            
            // Validate all components
            console.log('4. Component Validation:');
            const validations = [
                validateComponent('i_z0_zi', novaProof.i_z0_zi, 3),
                validateComponent('U_i_cmW_U_i_cmE', novaProof.U_i_cmW_U_i_cmE, 4),
                validateComponent('u_i_cmW', novaProof.u_i_cmW, 2),
                validateComponent('cmT_r', novaProof.cmT_r, 3),
                validateComponent('pA', novaProof.pA, 2),
                validateComponent('pB[0]', novaProof.pB[0], 2),
                validateComponent('pB[1]', novaProof.pB[1], 2),
                validateComponent('pC', novaProof.pC, 2),
                validateComponent('challenge_W_challenge_E_kzg_evals', novaProof.challenge_W_challenge_E_kzg_evals, 4),
                validateComponent('kzg_proof[0]', novaProof.kzg_proof[0], 2),
                validateComponent('kzg_proof[1]', novaProof.kzg_proof[1], 2)
            ];
            
            const allValid = validations.every(v => v);
            console.log(`5. Overall validation: ${allValid ? '✓ PASS' : '❌ FAIL'}`);
            
            // Generate a unique proof ID based on timestamp
            const proofId = Math.floor(Date.now() / 1000);
            
            debugLog(`Verifying device proximity for ${deviceId} at (${x}, ${y})...`, 'info');
            
            // Log the exact parameters being sent to contract
            console.log('6. Contract Call Parameters:', {
                deviceIdentifier: deviceIdentifier,
                proofId: proofId,
                gasLimit: 1000000
            });
            
            // Log the raw proof data that will be sent
            console.log('7. Raw Proof Data (first element of each):', {
                i_z0_zi_0: novaProof.i_z0_zi[0],
                U_i_cmW_U_i_cmE_0: novaProof.U_i_cmW_U_i_cmE[0],
                u_i_cmW_0: novaProof.u_i_cmW[0],
                cmT_r_0: novaProof.cmT_r[0],
                pA_0: novaProof.pA[0],
                pB_0_0: novaProof.pB[0][0],
                pC_0: novaProof.pC[0],
                challenge_0: novaProof.challenge_W_challenge_E_kzg_evals[0],
                kzg_proof_0_0: novaProof.kzg_proof[0][0]
            });
            
            // Skip gas estimation to avoid unpredictable errors
            // Use a fixed gas limit that's known to work
            const gasLimit = 2000000; // 2M gas - sufficient for Nova verification
            console.log('8. Using fixed gas limit:', gasLimit);
            
            // Call the verifier with all Nova proof parameters
            console.log('9. Sending transaction...');
            const tx = await this.contract.verifyDeviceProximity(
                novaProof.i_z0_zi,
                novaProof.U_i_cmW_U_i_cmE,
                novaProof.u_i_cmW,
                novaProof.cmT_r,
                novaProof.pA,
                novaProof.pB,
                novaProof.pC,
                novaProof.challenge_W_challenge_E_kzg_evals,
                novaProof.kzg_proof,
                deviceIdentifier,  // Use DID-based identifier if available
                proofId,
                {
                    gasLimit: gasLimit // Fixed gas limit
                }
            );
            
            debugLog(`Verification transaction sent: ${tx.hash}`, 'info');
            
            let receipt;
            try {
                receipt = await tx.wait();
                debugLog(`Device proximity verified! TX: ${receipt.transactionHash}`, 'success');
            } catch (waitError) {
                console.error('Transaction wait error:', waitError);
                // Try to get more details about the error
                if (waitError.receipt) {
                    console.error('Transaction receipt:', waitError.receipt);
                }
                throw waitError;
            }
            
            // Check if device is within proximity from the proof
            const isWithinProximity = novaProof.i_z0_zi[2] === '0x0000000000000000000000000000000000000000000000000000000000000001';
            
            // Verify the transaction actually updated the device state
            try {
                const updatedDeviceInfo = await this.contract.getDeviceInfo(deviceIdentifier);
                console.log('Device info after verification:', {
                    lastProximityProof: updatedDeviceInfo.lastProximityProof.toString(),
                    pendingRewards: ethers.utils.formatEther(updatedDeviceInfo.pendingRewards)
                });
                
                // Check if rewards were actually added
                const hasRewards = updatedDeviceInfo.pendingRewards.gt(0);
                if (!hasRewards) {
                    console.warn('Verification transaction succeeded but no rewards were added');
                }
            } catch (e) {
                console.error('Could not check device info after verification:', e);
            }
            
            return {
                success: true,
                txHash: receipt.transactionHash,
                explorerUrl: `${config.blockchain.iotex.explorerUrl}/tx/${receipt.transactionHash}`,
                withinProximity: isWithinProximity,
                rewardEligible: isWithinProximity,
                center: { x: 5000, y: 5000 },
                radius: 100
            };
        } catch (error) {
            debugLog(`Device verification error: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }
    
    // Claim accumulated rewards for a device
    async claimRewards(deviceId) {
        if (!this.contract) await this.connect();
        
        try {
            // Use the same device identifier logic as verification
            let deviceIdBytes32;
            if (window.deviceIoIDMap && window.deviceIoIDMap.has(deviceId)) {
                const ioIDInfo = window.deviceIoIDMap.get(deviceId);
                deviceIdBytes32 = ioIDInfo.deviceId;
                debugLog(`Using ioID for reward claim: ${ioIDInfo.ioId}`, 'info');
            } else {
                deviceIdBytes32 = await this.deviceIdToBytes32(deviceId);
                debugLog(`Using device hash for reward claim`, 'info');
            }
            
            // Check rewards
            const deviceInfo = await this.contract.getDeviceInfo(deviceIdBytes32);
            const pendingRewards = ethers.utils.formatEther(deviceInfo.pendingRewards);
            
            if (parseFloat(pendingRewards) === 0) {
                return { success: false, error: 'No rewards to claim' };
            }
            
            // Check contract balance before claiming
            const contractBalance = await this.provider.getBalance(this.contract.address);
            const contractBalanceFormatted = ethers.utils.formatEther(contractBalance);
            
            debugLog(`Contract balance: ${contractBalanceFormatted} IOTX`, 'info');
            
            if (contractBalance.lt(deviceInfo.pendingRewards)) {
                return { 
                    success: false, 
                    error: `Contract has insufficient balance (${contractBalanceFormatted} IOTX) to pay rewards. Please add IOTX to contract: ${this.contract.address}` 
                };
            }
            
            debugLog(`Claiming ${pendingRewards} IOTX rewards for device ${deviceId}...`, 'info');
            
            // Claim rewards
            const tx = await this.contract.claimRewards(deviceIdBytes32, {
                gasLimit: 500000 // Increased gas limit for reward claim
            });
            const receipt = await tx.wait();
            
            debugLog(`Rewards claimed! TX: ${receipt.transactionHash}`, 'success');
            
            return {
                success: true,
                txHash: receipt.transactionHash,
                explorerUrl: `${config.blockchain.iotex.explorerUrl}/tx/${receipt.transactionHash}`,
                rewardAmount: pendingRewards,
                currency: 'IOTX'
            };
        } catch (error) {
            debugLog(`Claim rewards error: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }
    
    // Get device information
    async getDeviceInfo(deviceId) {
        if (!this.contract) await this.connect();
        
        try {
            const deviceIdBytes32 = await this.deviceIdToBytes32(deviceId);
            const info = await this.contract.getDeviceInfo(deviceIdBytes32);
            
            return {
                owner: info.owner,
                registered: info.registered,
                registrationTime: new Date(info.registrationTime.toNumber() * 1000),
                lastProximityProof: info.lastProximityProof.toNumber() > 0 
                    ? new Date(info.lastProximityProof.toNumber() * 1000) 
                    : null,
                pendingRewards: ethers.utils.formatEther(info.pendingRewards)
            };
        } catch (error) {
            debugLog(`Get device info error: ${error.message}`, 'error');
            return null;
        }
    }
}

// Global function for verification only (registration happens separately)
window.verifyDeviceProximityOnIoTeX = async function(deviceId, x, y, proofData) {
    try {
        const verifier = new IoTeXDeviceVerifier();
        
        // Don't auto-register here - that should be a separate workflow step
        // Just verify the proximity
        const result = await verifier.verifyDeviceProximity(deviceId, x, y, proofData);
        return result;
    } catch (error) {
        debugLog(`IoTeX device verification failed: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
};

// Global function for device registration
window.registerDeviceOnIoTeX = async function(deviceId) {
    try {
        const verifier = new IoTeXDeviceVerifier();
        const result = await verifier.registerDevice(deviceId);
        return result;
    } catch (error) {
        debugLog(`IoTeX device registration failed: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
};

// Export for module usage
window.IoTeXDeviceVerifier = IoTeXDeviceVerifier;