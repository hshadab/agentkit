/**
 * zkML Agent Auditor Dashboard
 * Frontend logic with ethers.js integration
 */

// Wait for ethers to load
let ethers;

// Configuration
const CONFIG = {
    BACKEND_URL: 'http://localhost:9002',
    REGISTRY_ADDRESS: '0xF86630d38fd30dE173A7548806e1f12522dC5E27',
    USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    VERIFIER_ADDRESS: '0xf752509cb5af017f465B42053d41B730991c6624',
    BASE_SEPOLIA_CHAIN_ID: '0x14A34', // 84532
    VALIDATION_FEE: '0', // FREE (was 2 USDC)
    IS_FREE: true, // Skip payment steps
};

// Contract ABIs
const USDC_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

const REGISTRY_ABI = [
    'function requestValidation(bytes32 agentValidatorId, bytes32 agentServerId, bytes32 dataHash) external',
    'function validationCount() view returns (uint256)',
    'function validations(uint256) view returns (bytes32, bytes32, bytes32, uint8, bool, uint256)',
];

// Global state
let provider;
let signer;
let userAddress;
let currentWorkflow = {
    sessionId: null,
    agentId: null,
    dataHash: null,
    modelHash: null,
    agentName: null,
    step: 1,
};

// Initialize - wait for ethers to load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for ethers to be available
    const checkEthers = setInterval(() => {
        if (window.ethers) {
            clearInterval(checkEthers);
            ethers = window.ethers;
            console.log('✅ ethers.js loaded');

            setupEventListeners();
            checkWalletConnection();
            loadValidationHistory();
            updateValidationStats();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        if (!ethers) {
            clearInterval(checkEthers);
            console.error('❌ Failed to load ethers.js');
            showError('Failed to load required libraries. Please refresh the page.');
        }
    }, 5000);
});

function setupEventListeners() {
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('agentForm').addEventListener('submit', handleSubmitAgent);
    document.getElementById('workflowActionButton').addEventListener('click', handleWorkflowAction);
    document.getElementById('newValidationButton').addEventListener('click', resetWorkflow);
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

        showLoading('Connecting wallet...');

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
        document.getElementById('connectButton').classList.add('hidden');
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('walletAddress').textContent =
            `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

        // Enable submit button
        document.getElementById('submitButton').disabled = false;
        document.getElementById('submitButton').textContent = 'Submit Agent for Validation';

        // Get USDC balance
        await updateUSDCBalance();

        hideLoading();
        console.log('✅ Wallet connected:', userAddress);
    } catch (error) {
        console.error('Error connecting wallet:', error);
        hideLoading();
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
        document.getElementById('walletBalance').textContent = `${formatted} USDC`;
    } catch (error) {
        console.error('Error getting USDC balance:', error);
    }
}

async function updateValidationStats() {
    try {
        const registryContract = new ethers.Contract(
            CONFIG.REGISTRY_ADDRESS,
            REGISTRY_ABI,
            new ethers.providers.JsonRpcProvider('https://sepolia.base.org')
        );
        const count = await registryContract.validationCount();
        document.getElementById('totalValidations').textContent = count.toString();
    } catch (error) {
        console.error('Error getting validation stats:', error);
    }
}

// Step 1: Submit Agent
async function handleSubmitAgent(e) {
    e.preventDefault();

    if (!userAddress) {
        alert('Please connect your wallet first');
        return;
    }

    const agentName = document.getElementById('agentName').value.trim();
    const agentDescription = document.getElementById('agentDescription').value.trim();
    const modelHash = document.getElementById('modelHash').value.trim();

    // Validate model hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(modelHash)) {
        alert('Invalid model hash format. Must be a 32-byte hex string (0x...)');
        return;
    }

    try {
        showLoading('Submitting agent info...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/submit-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName,
                agentDescription,
                modelHash
            }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to submit agent');
        }

        // Store workflow data
        currentWorkflow = {
            sessionId: data.sessionId,
            agentId: data.agentId,
            dataHash: data.dataHash,
            modelHash: modelHash,
            agentName: agentName,
            step: 2,
        };

        // Show workflow card and hide submission form
        document.getElementById('submissionCard').classList.add('hidden');
        document.getElementById('workflowCard').classList.remove('hidden');

        // Update step 1 status
        updateStepStatus(1, 'completed', '✓ Agent submitted');

        // Move to step 2
        updateStepStatus(2, 'active', 'Ready to approve');
        document.getElementById('workflowActionButton').textContent = 'Approve USDC';

        hideLoading();
        console.log('✅ Agent submitted:', data);

    } catch (error) {
        console.error('Error submitting agent:', error);
        hideLoading();
        showError(error.message);
    }
}

// Workflow action handler
async function handleWorkflowAction() {
    const step = currentWorkflow.step;

    switch(step) {
        case 2:
            await handleApproveUSDC();
            break;
        case 3:
            await handlePayValidationFee();
            break;
        case 4:
            await handleGenerateProof();
            break;
        case 5:
            await handleFinalizeValidation();
            break;
        default:
            console.error('Invalid workflow step:', step);
    }
}

// Step 2: Approve USDC
async function handleApproveUSDC() {
    try {
        showLoading('Approving USDC...');
        updateStepStatus(2, 'processing', 'Waiting for transaction...');

        const usdcContract = new ethers.Contract(CONFIG.USDC_ADDRESS, USDC_ABI, signer);
        const tx = await usdcContract.approve(CONFIG.REGISTRY_ADDRESS, CONFIG.VALIDATION_FEE);

        updateStepStatus(2, 'processing', 'Confirming transaction...');
        await tx.wait();

        updateStepStatus(2, 'completed', `✓ Approved (${tx.hash.substring(0, 10)}...)`);
        currentWorkflow.step = 3;

        // Move to step 3
        updateStepStatus(3, 'active', 'Ready to pay');
        document.getElementById('workflowActionButton').textContent = 'Pay Validation Fee';

        hideLoading();
        console.log('✅ USDC approved:', tx.hash);

    } catch (error) {
        console.error('Error approving USDC:', error);
        updateStepStatus(2, 'active', 'Approval failed - retry');
        hideLoading();
        showError(error.message);
    }
}

// Step 3: Pay Validation Fee
async function handlePayValidationFee() {
    try {
        showLoading('Processing payment...');
        updateStepStatus(3, 'processing', 'Waiting for transaction...');

        const registryContract = new ethers.Contract(CONFIG.REGISTRY_ADDRESS, REGISTRY_ABI, signer);

        // NovaNet validator ID
        const NOVANET_VALIDATOR_ID = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes('NOVANET_ZKML_VALIDATOR_V1')
        );

        const tx = await registryContract.requestValidation(
            NOVANET_VALIDATOR_ID,
            currentWorkflow.agentId,
            currentWorkflow.dataHash
        );

        updateStepStatus(3, 'processing', 'Confirming payment...');
        await tx.wait();

        updateStepStatus(3, 'completed', `✓ Paid (${tx.hash.substring(0, 10)}...)`);
        currentWorkflow.step = 4;

        // Move to step 4
        updateStepStatus(4, 'active', 'Ready to generate proof');
        document.getElementById('workflowActionButton').textContent = 'Generate zkML Proof';

        // Update balance
        await updateUSDCBalance();

        hideLoading();
        console.log('✅ Validation fee paid:', tx.hash);

    } catch (error) {
        console.error('Error paying validation fee:', error);
        updateStepStatus(3, 'active', 'Payment failed - retry');
        hideLoading();
        showError(error.message);
    }
}

// Step 4: Generate Proof
async function handleGenerateProof() {
    try {
        showLoading('Generating zkML proof (~600ms)...');
        updateStepStatus(4, 'processing', 'JOLT-Atlas running...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/generate-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: currentWorkflow.sessionId }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to generate proof');
        }

        currentWorkflow.proof = data.proof;
        currentWorkflow.publicSignals = data.publicSignals;
        currentWorkflow.score = data.score;

        const decision = data.decision ? '✅ APPROVED' : '❌ DENIED';
        const confidence = (data.confidence * 100).toFixed(1);

        updateStepStatus(4, 'completed', `✓ Proof generated (Score: ${data.score}/100)`);
        currentWorkflow.step = 5;

        // Move to step 5
        updateStepStatus(5, 'active', 'Ready to finalize');
        document.getElementById('workflowActionButton').textContent = 'Finalize Validation';

        hideLoading();
        console.log('✅ Proof generated:', data);

    } catch (error) {
        console.error('Error generating proof:', error);
        updateStepStatus(4, 'active', 'Proof generation failed - retry');
        hideLoading();
        showError(error.message);
    }
}

// Step 5: Finalize Validation
async function handleFinalizeValidation() {
    try {
        showLoading('Submitting to blockchain...');
        updateStepStatus(5, 'processing', 'Submitting proof on-chain...');

        const response = await fetch(`${CONFIG.BACKEND_URL}/finalize-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: currentWorkflow.sessionId }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to finalize validation');
        }

        updateStepStatus(5, 'completed', `✓ Finalized (${data.txHash.substring(0, 10)}...)`);

        // Show certificate
        showCertificate({
            txHash: data.txHash,
            explorerUrl: `https://sepolia.basescan.org/tx/${data.txHash}`,
        });

        // Add to history
        addToHistory({
            agentName: currentWorkflow.agentName,
            score: currentWorkflow.score,
            txHash: data.txHash,
            timestamp: new Date().toISOString(),
        });

        // Update stats
        await updateValidationStats();

        hideLoading();
        console.log('✅ Validation finalized:', data.txHash);

    } catch (error) {
        console.error('Error finalizing validation:', error);
        updateStepStatus(5, 'active', 'Finalization failed - retry');
        hideLoading();
        showError(error.message);
    }
}

// UI Helper Functions
function updateStepStatus(stepNum, status, message) {
    const step = document.getElementById(`step${stepNum}`);
    if (!step) return;

    // Remove all status classes
    step.classList.remove('active', 'completed', 'processing');

    // Add new status
    step.classList.add(status);

    // Update status text
    const statusElement = step.querySelector('.step-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showCertificate(data) {
    // Hide workflow
    document.getElementById('workflowCard').classList.add('hidden');

    // Show certificate
    document.getElementById('certificateCard').classList.remove('hidden');

    // Fill certificate data
    document.getElementById('certAgentName').textContent = currentWorkflow.agentName;
    document.getElementById('certScore').textContent = `${currentWorkflow.score}/100`;
    document.getElementById('certModelHash').textContent =
        `${currentWorkflow.modelHash.substring(0, 10)}...${currentWorkflow.modelHash.slice(-8)}`;
    document.getElementById('certTxLink').href = data.explorerUrl;
    document.getElementById('certTxLink').textContent = `${data.txHash.substring(0, 20)}...`;
    document.getElementById('certTimestamp').textContent = new Date().toLocaleString();
}

function resetWorkflow() {
    // Reset workflow state
    currentWorkflow = {
        sessionId: null,
        agentId: null,
        dataHash: null,
        modelHash: null,
        agentName: null,
        step: 1,
    };

    // Reset form
    document.getElementById('agentForm').reset();

    // Show submission form, hide others
    document.getElementById('submissionCard').classList.remove('hidden');
    document.getElementById('workflowCard').classList.add('hidden');
    document.getElementById('certificateCard').classList.add('hidden');

    // Reset all step statuses
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        step.classList.remove('active', 'completed', 'processing');
        const statusElement = step.querySelector('.step-status');
        if (statusElement) {
            statusElement.textContent = 'Pending';
        }
    }
}

function addToHistory(validation) {
    const historyList = document.getElementById('historyList');

    // Remove empty state
    const emptyState = historyList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Create history item
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <div>
            <strong>${validation.agentName}</strong>
            <br>
            <small>Score: ${validation.score}/100 • ${new Date(validation.timestamp).toLocaleString()}</small>
        </div>
        <a href="https://sepolia.basescan.org/tx/${validation.txHash}" target="_blank" style="color: var(--primary);">
            View TX
        </a>
    `;

    // Add to top
    historyList.insertBefore(item, historyList.firstChild);

    // Save to localStorage
    saveToLocalStorage(validation);
}

function loadValidationHistory() {
    const history = JSON.parse(localStorage.getItem('validationHistory') || '[]');

    if (history.length === 0) return;

    const historyList = document.getElementById('historyList');
    const emptyState = historyList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    history.forEach(validation => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div>
                <strong>${validation.agentName}</strong>
                <br>
                <small>Score: ${validation.score}/100 • ${new Date(validation.timestamp).toLocaleString()}</small>
            </div>
            <a href="https://sepolia.basescan.org/tx/${validation.txHash}" target="_blank" style="color: var(--primary);">
                View TX
            </a>
        `;
        historyList.appendChild(item);
    });
}

function saveToLocalStorage(validation) {
    const history = JSON.parse(localStorage.getItem('validationHistory') || '[]');
    history.unshift(validation);

    // Keep only last 10
    if (history.length > 10) {
        history.pop();
    }

    localStorage.setItem('validationHistory', JSON.stringify(history));
}

function showLoading(message) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = message;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showError(message) {
    alert('Error: ' + message);
}

// Listen for account/network changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            connectWallet();
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
