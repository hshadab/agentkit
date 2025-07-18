// Proof Manager - Handles all proof-related operations
import { debugLog, formatProofSize, formatTimestamp, copyToClipboard } from './utils.js';

export class ProofManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentProofId = null;
        this.localVerifications = new Map();
        this.onChainVerifications = new Map();
    }

    addProofCard(data) {
        debugLog(`Adding proof card for ${data.proofId}`, 'info');
        
        const proofCard = document.createElement('div');
        proofCard.className = 'proof-card';
        proofCard.setAttribute('data-proof-id', data.proofId);
        
        const functionName = data.metadata?.function || 'Unknown Function';
        const args = data.metadata?.arguments || [];
        
        // Format generation time
        let generationTime = 'N/A';
        if (data.metrics?.generation_time_secs) {
            generationTime = `${data.metrics.generation_time_secs.toFixed(2)}s`;
        } else if (data.metrics?.time_ms) {
            generationTime = `${(data.metrics.time_ms / 1000).toFixed(2)}s`;
        }
        
        // Format proof size
        let proofSize = 'N/A';
        if (data.metrics?.proof_size) {
            proofSize = formatProofSize(data.metrics.proof_size);
        } else if (data.metrics?.file_size_mb) {
            proofSize = formatProofSize(data.metrics.file_size_mb);
        }
        
        proofCard.innerHTML = `
            <div class="card-header">
                <div class="card-header-row">
                    <div>
                        <div class="card-function-name">${functionName}</div>
                        <div class="card-title clickable-id" 
                             onclick="window.proofManager.copyProofId('${data.proofId}')" 
                             title="Click to copy ID">
                            Proof ID: ${data.proofId}
                        </div>
                    </div>
                    <span class="status-badge ${data.status}">${data.status.toUpperCase()}</span>
                </div>
            </div>
            <div class="card-content">
                <div class="status-message">
                    ${data.message || 'Proof generated successfully'}
                </div>
                ${args.length > 0 ? `
                    <div class="status-message" style="margin-top: 8px;">
                        Arguments: ${args.join(', ')}
                    </div>
                ` : ''}
                <div class="proof-metrics">
                    <div class="metric">
                        <span class="metric-label">Time:</span>
                        <span class="metric-value">${generationTime}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Size:</span>
                        <span class="metric-value">${proofSize}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Timestamp:</span>
                        <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
            ${data.status === 'complete' ? `
                <div class="card-actions">
                    <button class="action-btn" onclick="window.proofManager.verifyProof('${data.proofId}')">
                        ✓ Verify Locally
                    </button>
                    <button class="action-btn eth-verify-btn" 
                            onclick="window.blockchainVerifier.verifyOnEthereum('${data.proofId}', '${functionName}')">
                        🔷 Verify on Ethereum
                    </button>
                    <button class="action-btn sol-verify-btn" 
                            onclick="window.blockchainVerifier.verifyOnSolana('${data.proofId}', '${functionName}')">
                        ◎ Verify on Solana
                    </button>
                </div>
            ` : ''}
        `;
        
        this.currentProofId = data.proofId;
        return proofCard;
    }

    updateProofCard(proofId, status, data = {}) {
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
        if (!proofCard) {
            debugLog(`Proof card not found for ${proofId}`, 'warning');
            return;
        }

        const statusBadge = proofCard.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${status}`;
            statusBadge.textContent = status.toUpperCase();
        }

        if (data.message) {
            const statusMessage = proofCard.querySelector('.status-message');
            if (statusMessage) {
                statusMessage.textContent = data.message;
            }
        }

        // Update metrics if provided
        if (data.metrics) {
            const metricsDiv = proofCard.querySelector('.proof-metrics');
            if (metricsDiv && data.metrics.generation_time_secs) {
                const timeValue = metricsDiv.querySelector('.metric-value');
                if (timeValue) {
                    timeValue.textContent = `${data.metrics.generation_time_secs.toFixed(2)}s`;
                }
            }
        }

        // Add actions if status is complete
        if (status === 'complete' && !proofCard.querySelector('.card-actions')) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions';
            actionsDiv.innerHTML = `
                <button class="action-btn" onclick="window.proofManager.downloadProof('${proofId}')">
                    📥 Download
                </button>
                <button class="action-btn" onclick="window.proofManager.verifyProof('${proofId}')">
                    ✓ Verify Locally
                </button>
                <button class="action-btn eth-verify-btn" 
                        onclick="window.blockchainVerifier.verifyOnEthereum('${proofId}', 'proof')">
                    🔷 Verify on Ethereum
                </button>
                <button class="action-btn sol-verify-btn" 
                        onclick="window.blockchainVerifier.verifyOnSolana('${proofId}', 'proof')">
                    ◎ Verify on Solana
                </button>
            `;
            proofCard.appendChild(actionsDiv);
        }
    }

    async downloadProof(proofId) {
        try {
            debugLog(`Downloading proof ${proofId}`, 'info');
            const response = await fetch(`/api/v1/proof/${proofId}/download`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `proof_${proofId}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.uiManager.showToast('Proof downloaded successfully', 'success');
        } catch (error) {
            debugLog(`Error downloading proof: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to download proof', 'error');
        }
    }

    async verifyProof(proofId) {
        try {
            debugLog(`Verifying proof ${proofId} locally`, 'info');
            
            // Update button state
            const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
            const verifyBtn = proofCard?.querySelector('.action-btn:first-child');
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.textContent = '⏳ Verifying...';
            }
            
            const response = await fetch(`/api/v1/proof/${proofId}/verify`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.valid) {
                this.localVerifications.set(proofId, result);
                this.uiManager.showToast('Proof verified successfully!', 'success');
                if (verifyBtn) {
                    verifyBtn.textContent = '✅ Verified';
                    verifyBtn.style.background = 'rgba(16, 185, 129, 0.2)';
                    verifyBtn.style.color = '#10b981';
                }
            } else {
                this.uiManager.showToast('Proof verification failed', 'error');
                if (verifyBtn) {
                    verifyBtn.textContent = '❌ Invalid';
                    verifyBtn.disabled = false;
                }
            }
            
            // Add verification result to UI
            if (result.details) {
                const verificationCard = this.createVerificationResultCard(proofId, result);
                this.uiManager.addMessage(verificationCard, 'assistant');
            }
            
        } catch (error) {
            debugLog(`Error verifying proof: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to verify proof', 'error');
            
            const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
            const verifyBtn = proofCard?.querySelector('.action-btn:nth-child(2)');
            if (verifyBtn) {
                verifyBtn.textContent = '✓ Verify Locally';
                verifyBtn.disabled = false;
            }
        }
    }

    createVerificationResultCard(proofId, result) {
        const card = document.createElement('div');
        card.className = 'verification-card';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">Local Verification Result</div>
                <span class="status-badge ${result.valid ? 'verified' : 'error'}">
                    ${result.valid ? 'VALID' : 'INVALID'}
                </span>
            </div>
            <div class="card-content">
                <div class="status-message">
                    Proof ID: ${proofId}
                </div>
                ${result.details ? `
                    <div class="status-message" style="margin-top: 8px;">
                        ${result.details}
                    </div>
                ` : ''}
                <div class="proof-metrics">
                    <div class="metric">
                        <span class="metric-label">Verified at:</span>
                        <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    copyProofId(proofId) {
        copyToClipboard(proofId);
        this.uiManager.showToast('Proof ID copied to clipboard', 'success');
    }

    displayProofHistory(data) {
        if (!data.proofs || data.proofs.length === 0) {
            this.uiManager.addMessage('No proof history found.', 'assistant');
            return;
        }

        const historyContainer = document.createElement('div');
        historyContainer.innerHTML = `
            <h3 style="color: #8B9AFF; margin-bottom: 16px;">
                Proof History (${data.proofs.length} proofs)
            </h3>
            <div class="history-table-container">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Proof ID</th>
                            <th>Time</th>
                            <th>Size</th>
                            <th>Timestamp</th>
                            <th>Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="proof-history-body">
                    </tbody>
                </table>
            </div>
        `;

        const tbody = historyContainer.querySelector('#proof-history-body');
        data.proofs.forEach(proof => {
            tbody.appendChild(this.createProofHistoryRow(proof));
        });

        this.uiManager.addMessage(historyContainer, 'assistant');
    }

    createProofHistoryRow(proof) {
        const row = document.createElement('tr');
        
        const proofId = proof.proof_id || proof.id || 'unknown';
        const proofFunction = proof.function || proof.metadata?.function || 'unknown';
        const timestamp = formatTimestamp(proof.timestamp);
        
        const duration = proof.metrics?.time_ms ? 
            (proof.metrics.time_ms / 1000).toFixed(2) + 's' : 
            proof.metrics?.generation_time_secs ? 
            proof.metrics.generation_time_secs.toFixed(2) + 's' : 'N/A';
            
        const size = proof.metrics?.proof_size || proof.metrics?.file_size_mb ? 
            formatProofSize(proof.metrics.proof_size || proof.metrics.file_size_mb) : 'N/A';
        
        // Check verification status
        let verificationHTML = this.getVerificationStatusHTML(proofId, proof);
        let actionsHTML = this.getProofActionsHTML(proofId, proofFunction, proof.on_chain_verifications);
        
        row.innerHTML = `
            <td><span class="function-badge">${proofFunction}</span></td>
            <td><span class="proof-id clickable-id" 
                      onclick="window.proofManager.copyProofId('${proofId}')"
                      title="Click to copy">${proofId.substring(0, 8)}...</span></td>
            <td>${duration}</td>
            <td>${size}</td>
            <td class="timestamp">${timestamp}</td>
            <td>${verificationHTML}</td>
            <td>${actionsHTML}</td>
        `;
        
        return row;
    }

    getVerificationStatusHTML(proofId, proof) {
        // Check on-chain verification
        let onChainData = this.onChainVerifications.get(proofId) || proof.on_chain_verifications;
        
        if (onChainData) {
            const blockchainName = onChainData.blockchain;
            const shortName = blockchainName === 'Ethereum' ? 'ETH' : 'SOL';
            return `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #10b981;">✓ ${shortName}</span>
                    <a href="${onChainData.explorerUrl}" target="_blank" 
                       style="color: #8B9AFF; text-decoration: none; font-size: 11px; 
                              padding: 2px 6px; background: rgba(107, 124, 255, 0.2); 
                              border-radius: 4px; border: 1px solid rgba(107, 124, 255, 0.3);">
                        View
                    </a>
                </div>
            `;
        }
        
        // Check local verification
        const localVerification = this.localVerifications.get(proofId);
        if (localVerification && localVerification.valid) {
            return '<span style="color: #10b981;">✓ Local</span>';
        } else if (proof.verified === true) {
            return '<span style="color: #10b981;">✓ Local</span>';
        }
        
        return '<span style="color: #666;">Unverified</span>';
    }

    getProofActionsHTML(proofId, proofFunction, hasOnChainVerification) {
        if (!hasOnChainVerification) {
            return `
                <select class="verify-dropdown" onchange="window.handleVerifyAction('${proofId}', '${proofFunction}', this.value); this.value='';">
                    <option value="">Select action...</option>
                    <option value="local">Verify locally</option>
                    <option value="ethereum">Verify on Ethereum</option>
                    <option value="solana">Verify on Solana</option>
                </select>
            `;
        } else {
            return `
                <select class="verify-dropdown" onchange="window.handleVerifyAction('${proofId}', '${proofFunction}', this.value); this.value='';">
                    <option value="">Select action...</option>
                    <option value="local">Verify locally</option>
                </select>
            `;
        }
    }

    getCurrentProofId() {
        return this.currentProofId;
    }

    setCurrentProofId(proofId) {
        this.currentProofId = proofId;
    }
}