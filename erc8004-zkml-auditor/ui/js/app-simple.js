/**
 * zkML Agent Auditor Dashboard - Simplified (No Wallet Required)
 * Backend handles all blockchain interactions
 */

// Configuration
const CONFIG = {
    BACKEND_URL: 'http://localhost:9002',
    IS_FREE: true
};

// Global state
let currentWorkflow = {
    sessionId: null,
    agentId: null,
    dataHash: null,
    modelHash: null,
    agentName: null,
    step: 1
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadValidationHistory();
});

function setupEventListeners() {
    document.getElementById('agentForm').addEventListener('submit', handleSubmitAgent);

    const newValidationButton = document.getElementById('newValidationButton');
    if (newValidationButton) {
        newValidationButton.addEventListener('click', resetWorkflow);
    }
}

async function handleSubmitAgent(event) {
    event.preventDefault();

    const agentName = document.getElementById('agentName').value;
    const agentDescription = document.getElementById('agentDescription').value;
    const modelHash = document.getElementById('modelHash').value;

    showLoading('Submitting agent for validation...');

    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/submit-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName,
                description: agentDescription,
                modelHash,
                requester: 'anonymous' // Backend uses its own wallet
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit agent');
        }

        currentWorkflow.sessionId = data.sessionId;
        currentWorkflow.agentId = data.agentId;
        currentWorkflow.agentName = agentName;
        currentWorkflow.modelHash = modelHash;

        // Poll for completion
        await pollValidationStatus(data.sessionId);

    } catch (error) {
        console.error('Error submitting agent:', error);
        hideLoading();
        showError(error.message);
    }
}

async function pollValidationStatus(sessionId) {
    showLoading('Generating zkML proof (~600ms)...');

    const maxAttempts = 60; // 30 seconds
    let attempts = 0;

    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/status/${sessionId}`);
            const status = await response.json();

            console.log('Validation status:', status.status);

            if (status.status === 'completed') {
                clearInterval(pollInterval);
                hideLoading();
                displayCertificate(status);
                saveToHistory(status);
            } else if (status.status === 'error') {
                clearInterval(pollInterval);
                hideLoading();
                showError(status.error || 'Validation failed');
            } else if (status.status === 'proof_generated') {
                updateLoading('Submitting to blockchain...');
            }

            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                hideLoading();
                showError('Validation timeout - please try again');
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 500);
}

function displayCertificate(result) {
    document.getElementById('submissionCard').classList.add('hidden');
    document.getElementById('certificateCard').classList.remove('hidden');

    document.getElementById('certAgentName').textContent = currentWorkflow.agentName;
    document.getElementById('certScore').textContent = result.score + '/100';
    document.getElementById('certModelHash').textContent = currentWorkflow.modelHash;

    const txLink = document.getElementById('certTxLink');
    if (result.txHash) {
        txLink.textContent = result.txHash.substring(0, 10) + '...' + result.txHash.substring(result.txHash.length - 8);
        txLink.href = `https://sepolia.basescan.org/tx/${result.txHash}`;
    }

    document.getElementById('certTimestamp').textContent = new Date().toLocaleString();
}

function saveToHistory(result) {
    const history = JSON.parse(localStorage.getItem('validationHistory') || '[]');
    history.unshift({
        agentName: currentWorkflow.agentName,
        modelHash: currentWorkflow.modelHash,
        score: result.score,
        txHash: result.txHash,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('validationHistory', JSON.stringify(history.slice(0, 10)));
    loadValidationHistory();
}

function loadValidationHistory() {
    const history = JSON.parse(localStorage.getItem('validationHistory') || '[]');
    const historyList = document.getElementById('historyList');

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state"><p>No validations yet. Submit your first agent above!</p></div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-header">
                <strong>${item.agentName}</strong>
                <span class="history-score">Score: ${item.score}/100</span>
            </div>
            <div class="history-details">
                <small>${item.modelHash.substring(0, 20)}...</small>
                <small>${new Date(item.timestamp).toLocaleDateString()}</small>
            </div>
            ${item.txHash ? `<a href="https://sepolia.basescan.org/tx/${item.txHash}" target="_blank" class="history-link">View TX</a>` : ''}
        </div>
    `).join('');
}

function resetWorkflow() {
    document.getElementById('submissionCard').classList.remove('hidden');
    document.getElementById('certificateCard').classList.add('hidden');
    document.getElementById('agentForm').reset();
    currentWorkflow = { sessionId: null, agentId: null, dataHash: null, modelHash: null, agentName: null, step: 1 };
}

function showLoading(message) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = message;
}

function updateLoading(message) {
    document.getElementById('loadingText').textContent = message;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showError(message) {
    alert('Error: ' + message);
}
