// Configuration
const CONFIG = {
    BACKEND_URL: 'http://localhost:9002',
    USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    BASE_SEPOLIA_CHAIN_ID: '0x14A34', // 84532
    VALIDATION_FEE: '2000000', // 2 USDC (6 decimals)
};

// Contract ABIs
const USDC_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

const REGISTRY_ABI = [
    'function requestValidation(bytes32 agentValidatorId, bytes32 agentServerId, bytes32 dataHash) external payable',
];

// Global state
let provider;
let signer;
let userAddress;
let sessionData = {};
let registryAddress;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkWalletConnection();
});

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('submitForm').addEventListener('submit', handleSubmitAgent);
    document.getElementById('approveBtn').addEventListener('click', handleApproveUSDC);
    document.getElementById('payBtn').addEventListener('click', handlePayValidationFee);
    document.getElementById('generateProofBtn').addEventListener('click', handleGenerateProof);
    document.getElementById('finalizeBtn').addEventListener('click', handleFinalizeValidation);
    document.getElementById('downloadCert').addEventListener('click', downloadCertificate);
    document.getElementById('resetBtn').addEventListener('click', resetWorkflow);
}

async function checkWalletConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
        }
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this application');
            return;
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== 84532) {
            await switchToBaseSepolia();
        }

        // Update UI
        document.getElementById('connectWallet').classList.add('hidden');
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('walletAddress').textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

        // Get USDC balance
        await updateUSDCBalance();

        console.log('✅ Wallet connected:', userAddress);
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showError('Failed to connect wallet: ' + error.message);
    }
}

async function switchToBaseSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.BASE_SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CONFIG.BASE_SEPOLIA_CHAIN_ID,
                        chainName: 'Base Sepolia',
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18,
                        },
                        rpcUrls: ['https://sepolia.base.org'],
                        blockExplorerUrls: ['https://sepolia.basescan.org'],
                    }],
                });
            } catch (addError) {
                throw new Error('Failed to add Base Sepolia network');
            }
        } else {
            throw switchError;
        }
    }
}

async function updateUSDCBalance() {
    try {
        const usdcContract = new ethers.Contract(CONFIG.USDC_ADDRESS, USDC_ABI, signer);
        const balance = await usdcContract.balanceOf(userAddress);
        const formatted = ethers.utils.formatUnits(balance, 6);
        document.getElementById('usdcBalance').textContent = `${formatted} USDC`;
    } catch (error) {
        console.error('Error getting USDC balance:', error);
    }
}

// Step 1: Submit Agent
async function handleSubmitAgent(e) {
    e.preventDefault();

    if (!userAddress) {
        alert('Please connect your wallet first');
        return;
    }

    const agentName = document.getElementById('agentName').value;
    const agentDescription = document.getElementById('agentDescription').value;

    try {
        showLoading('step1', 'Submitting agent...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/submit-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentName, agentDescription }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to submit agent');
        }

        // Store session data
        sessionData = {
            sessionId: data.sessionId,
            agentId: data.agentId,
            dataHash: data.dataHash,
            agentName: agentName,
        };

        // Save registry address
        registryAddress = data.registryAddress;

        // Update UI
        document.getElementById('displaySessionId').textContent = data.sessionId.substring(0, 16) + '...';
        document.getElementById('displayAgentId').textContent = data.agentId.substring(0, 16) + '...';
        document.getElementById('displayDataHash').textContent = data.dataHash.substring(0, 16) + '...';

        showSuccess('step1', 'Agent submitted successfully!');
        moveToStep(2);

    } catch (error) {
        console.error('Error submitting agent:', error);
        showError('step1', error.message);
    }
}

// Step 2: Approve USDC
async function handleApproveUSDC() {
    try {
        if (!sessionData.sessionId) {
            alert('Please submit an agent first');
            return;
        }

        showLoading('approvalStatus', 'Approving USDC...');

        const usdcContract = new ethers.Contract(CONFIG.USDC_ADDRESS, USDC_ABI, signer);

        // Get registry address from backend
        const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/health`);
        const healthData = await healthResponse.json();
        const registryAddr = healthData.contract.address;

        const tx = await usdcContract.approve(registryAddr, CONFIG.VALIDATION_FEE);
        await tx.wait();

        showSuccess('approvalStatus', `Approval confirmed! TX: ${tx.hash.substring(0, 16)}...`);
        moveToStep(3);

    } catch (error) {
        console.error('Error approving USDC:', error);
        showError('approvalStatus', error.message);
    }
}

// Step 3: Pay Validation Fee
async function handlePayValidationFee() {
    try {
        if (!sessionData.sessionId) {
            alert('Please complete previous steps first');
            return;
        }

        showLoading('paymentStatus', 'Processing payment...');

        // Get registry address and create contract
        const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/health`);
        const healthData = await healthResponse.json();
        const registryAddr = healthData.contract.address;

        const registryContract = new ethers.Contract(registryAddr, REGISTRY_ABI, signer);

        // Call requestValidation
        const NOVANET_VALIDATOR_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('NOVANET_ZKML_VALIDATOR_V1'));

        const tx = await registryContract.requestValidation(
            NOVANET_VALIDATOR_ID,
            sessionData.agentId,
            sessionData.dataHash
        );
        await tx.wait();

        showSuccess('paymentStatus', `Payment confirmed! TX: ${tx.hash.substring(0, 16)}...`);
        moveToStep(4);

        // Update balance
        await updateUSDCBalance();

    } catch (error) {
        console.error('Error paying validation fee:', error);
        showError('paymentStatus', error.message);
    }
}

// Step 4: Generate Proof
async function handleGenerateProof() {
    try {
        if (!sessionData.sessionId) {
            alert('Please complete previous steps first');
            return;
        }

        showLoading('proofStatus', 'Generating zkML proof (~600ms)...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/generate-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sessionData.sessionId }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to generate proof');
        }

        // Store proof data
        sessionData.proof = data.proof;
        sessionData.publicSignals = data.publicSignals;
        sessionData.score = data.score;

        // Display proof result
        document.getElementById('proofDecision').textContent = data.decision ? '✅ APPROVED' : '❌ DENIED';
        document.getElementById('proofConfidence').textContent = (data.confidence * 100).toFixed(2) + '%';
        document.getElementById('proofScore').textContent = data.score;
        document.getElementById('proofResult').classList.remove('hidden');

        showSuccess('proofStatus', 'Proof generated successfully!');
        moveToStep(5);

    } catch (error) {
        console.error('Error generating proof:', error);
        showError('proofStatus', error.message);
    }
}

// Step 5: Finalize Validation
async function handleFinalizeValidation() {
    try {
        if (!sessionData.sessionId) {
            alert('Please complete previous steps first');
            return;
        }

        showLoading('finalizeStatus', 'Submitting to blockchain...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/finalize-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sessionData.sessionId }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to finalize validation');
        }

        showSuccess('finalizeStatus', 'Validation complete!');

        // Show certificate
        displayCertificate(data);

    } catch (error) {
        console.error('Error finalizing validation:', error);
        showError('finalizeStatus', error.message);
    }
}

function displayCertificate(data) {
    document.getElementById('certAgentName').textContent = sessionData.agentName;
    document.getElementById('certAgentId').textContent = sessionData.agentId;
    document.getElementById('certScore').textContent = sessionData.score;
    document.getElementById('certExplorer').href = data.explorerUrl;
    document.getElementById('certExplorer').textContent = data.explorerUrl;

    // Hide all steps
    document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));

    // Show certificate
    document.getElementById('certificate').classList.remove('hidden');
}

function downloadCertificate() {
    const cert = {
        agent: sessionData.agentName,
        agentId: sessionData.agentId,
        dataHash: sessionData.dataHash,
        score: sessionData.score,
        validator: 'NovaNet zkML (ERC-8004)',
        proofVerified: true,
        timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionData.agentName.replace(/\s/g, '_')}_certificate.json`;
    a.click();
}

function resetWorkflow() {
    sessionData = {};
    document.getElementById('submitForm').reset();
    document.getElementById('certificate').classList.add('hidden');
    document.querySelectorAll('.step').forEach(step => step.classList.remove('hidden'));
    moveToStep(1);
}

// UI Helpers
function moveToStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');
}

function showLoading(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = 'status-message loading';
        element.innerHTML = `<div class="spinner"></div>${message}`;
    }
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = 'status-message success';
        element.textContent = message;
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = 'status-message error';
        element.textContent = '❌ ' + message;
    }
}
