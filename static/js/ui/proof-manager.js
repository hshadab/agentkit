// Proof Manager - Handles all proof-related operations
import { debugLog, formatProofSize, formatTimestamp, copyToClipboard } from '../core/utils.js';

export class ProofManager {
    constructor(uiManager) {
        console.log('ProofManager initialized with new design');
        this.uiManager = uiManager;
        this.currentProofId = null;
        this.localVerifications = new Map();
        this.onChainVerifications = new Map();
        this.proofTimers = new Map();
        this.proofs = new Map(); // Store proof data
    }

    generateActionButtons(proofId, functionName) {
        // Always show verify buttons - auto-connection handles the connection
        let buttons = '';
        
        // Ethereum
        buttons += `
            <button type="button" class="action-btn eth-verify-btn" 
                    onclick="window.blockchainVerifier.verifyOnEthereum('${proofId}', '${functionName}')">
                Verify on Ethereum
            </button>`;
        
        // Solana
        buttons += `
            <button type="button" class="action-btn sol-verify-btn" 
                    onclick="window.blockchainVerifier.verifyOnSolana('${proofId}', '${functionName}')">
                Verify on Solana
            </button>`;
        
        // Base
        buttons += `
            <button type="button" class="action-btn base-verify-btn" 
                    onclick="return window.safeVerifyOnBase('${proofId}', '${functionName}');">
                Verify on Base
            </button>`;
        
        // Avalanche
        buttons += `
            <button type="button" class="action-btn avalanche-verify-btn" 
                    onclick="event.preventDefault(); event.stopPropagation(); window.safeVerifyOnAvalanche('${proofId}', '${functionName}'); return false;">
                Verify on Avalanche
            </button>`;
        
        return buttons;
    }

    addProofCard(data) {
        debugLog(`Adding proof card for ${data.proofId}`, 'info');
        console.log('Proof card data:', data);
        
        const proofCard = document.createElement('div');
        proofCard.className = 'proof-card';
        proofCard.setAttribute('data-proof-id', data.proofId);
        proofCard.setAttribute('data-start-time', Date.now());
        
        const functionName = data.metadata?.function || data.proof_function || 'Unknown Function';
        console.log('[PROOF_CARD_DEBUG] functionName:', functionName);
        proofCard.setAttribute('data-function-name', functionName);
        const plainEnglishName = this.getPlainEnglishName(functionName);
        
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
                        <div class="card-function-name">Zero Knowledge Proof Execution</div>
                        <div class="card-title clickable-id" 
                             onclick="window.proofManager.copyProofId('${data.proofId}')" 
                             title="Click to copy ID">
                            Proof ID: ${data.proofId}
                        </div>
                    </div>
                    <span class="status-badge ${data.status}">${data.status === 'generating' ? 'GENERATING' : 'COMPLETE'}</span>
                </div>
            </div>
            <div class="card-content">
                ${data.status === 'complete' ? `
                    <div class="proof-metrics">
                        <div class="metric">
                            <span class="metric-label">Time:</span>
                            <span class="metric-value">${generationTime}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memory:</span>
                            <span class="metric-value">${proofSize}</span>
                        </div>
                    </div>
                    ${functionName === 'prove_ai_content' ? this.getAICommitmentHTML(data) : ''}
                    ${functionName === 'prove_medical_integrity' ? this.getMedicalCommitmentHTML(data) : ''}
                ` : `
                    <div class="proof-generating-box pulsating">
                        <div class="proof-type-name">${plainEnglishName}</div>
                        <div class="proof-timer" id="timer-${data.proofId}">0.0s</div>
                    </div>
                `}
            </div>
            ${data.status === 'complete' ? `
                <div class="card-actions">
                    ${this.generateActionButtons(data.proofId, functionName)}
                    ${functionName === 'prove_device_proximity' ? `
                    <button class="action-btn iotex-verify-btn" 
                            onclick="window.blockchainVerifier.verifyDeviceOnIoTeX('${data.proofId}', '${data.proofId}')">
                        Verify on IoTeX
                    </button>
                    ` : ''}
                </div>
                ${functionName === 'prove_device_proximity' && data.metadata ? `
                    <div class="device-metadata" style="margin-top: 12px; padding: 8px; background: rgba(0, 212, 181, 0.1); border-radius: 4px; font-size: 12px; color: #00D4B5;">
                        Device: ${data.metadata.arguments?.[0] || 'Unknown'} | 
                        Location: (${data.metadata.arguments?.[1] || '?'}, ${data.metadata.arguments?.[2] || '?'})
                    </div>
                ` : ''}
                <div class="verification-results" id="verification-results-${data.proofId}">
                    <!-- Verification results will be added here -->
                </div>
            ` : ''}
        `;
        
        // Start timer if generating
        if (data.status === 'generating') {
            this.startProofTimer(data.proofId);
        }
        
        this.currentProofId = data.proofId;
        return proofCard;
    }

    getPlainEnglishName(functionName) {
        const nameMap = {
            'prove_kyc': 'KYC Compliance Verification',
            'prove_location': 'Location Verification',
            'prove_ai_content': 'AI Prediction Commitment',
            'prove_device_proximity': 'Device Proximity Verification',
            'prove_age': 'Age Verification',
            'prove_identity': 'Identity Verification'
        };
        return nameMap[functionName] || functionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getProofTypeDisplayName(functionName) {
        const nameMap = {
            'prove_kyc': 'KYC',
            'prove_location': 'LOCATION',
            'prove_ai_content': 'AI PREDICTION',
            'prove_device_proximity': 'DEVICE PROXIMITY',
            'prove_medical_integrity': 'MEDICAL INTEGRITY',
            'prove_age': 'AGE',
            'prove_identity': 'IDENTITY'
        };
        return nameMap[functionName] || functionName.toUpperCase().replace(/_/g, ' ');
    }

    startProofTimer(proofId) {
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const timerElement = document.getElementById(`timer-${proofId}`);
            if (timerElement) {
                timerElement.textContent = `${elapsed.toFixed(1)}s`;
            } else {
                clearInterval(timer);
                this.proofTimers.delete(proofId);
            }
        }, 100);
        this.proofTimers.set(proofId, timer);
    }

    stopProofTimer(proofId) {
        const timer = this.proofTimers.get(proofId);
        if (timer) {
            clearInterval(timer);
            this.proofTimers.delete(proofId);
        }
    }

    updateProofCard(proofId, status, data = {}) {
        try {
            const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
            if (!proofCard) {
                debugLog(`Proof card not found for ${proofId}`, 'warning');
                console.error('[UPDATE_PROOF_CARD] Card not found for:', proofId);
                return;
            }
            
            console.log('[UPDATE_PROOF_CARD] Found card for:', proofId, 'status:', status);

            // Stop timer if completing
            if (status === 'complete') {
                this.stopProofTimer(proofId);
            }

            const statusBadge = proofCard.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = `status-badge ${status}`;
                statusBadge.textContent = status === 'complete' ? 'COMPLETE' : status.toUpperCase();
            }

            // If completing, replace the content with metrics
            if (status === 'complete') {
                console.log('[UPDATE_PROOF_CARD] Status is complete, updating content...');
                const contentDiv = proofCard.querySelector('.card-content');
                console.log('[UPDATE_PROOF_CARD] Found contentDiv:', !!contentDiv);
                if (contentDiv) {
                    // Get the function name from the card's data attribute (preserved from creation)
                    const functionName = proofCard.getAttribute('data-function-name') || 
                                       data.metadata?.function || 
                                       data.proof_function || 
                                       'Unknown';
                    console.log('[UPDATE_PROOF_CARD_DEBUG] functionName:', functionName, 'data:', data);
                
                // Format generation time and size
                let generationTime = 'N/A';
                if (data.metrics?.generation_time_secs) {
                    generationTime = `${data.metrics.generation_time_secs.toFixed(2)}s`;
                } else if (data.metrics?.time_ms) {
                    generationTime = `${(data.metrics.time_ms / 1000).toFixed(2)}s`;
                }
                
                let proofSize = 'N/A';
                if (data.metrics?.proof_size) {
                    proofSize = formatProofSize(data.metrics.proof_size);
                } else if (data.metrics?.file_size_mb) {
                    proofSize = formatProofSize(data.metrics.file_size_mb);
                }
                
                const newContent = `
                    <div class="proof-metrics">
                        <div class="metric">
                            <span class="metric-label">Time:</span>
                            <span class="metric-value">${generationTime}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memory:</span>
                            <span class="metric-value">${proofSize}</span>
                        </div>
                    </div>
                    ${functionName === 'prove_ai_content' ? this.getAICommitmentHTML(data) : ''}
                    ${functionName === 'prove_medical_integrity' ? this.getMedicalCommitmentHTML(data) : ''}
                `;
                console.log('[UPDATE_PROOF_CARD] Setting innerHTML, includes Base link:', functionName === 'prove_ai_content');
                contentDiv.innerHTML = newContent;
            }

            // Add actions if not already present
            if (!proofCard.querySelector('.card-actions')) {
                console.log('[UPDATE_PROOF_CARD] Adding actions section');
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'card-actions';
                actionsDiv.innerHTML = this.generateActionButtons(proofId, data.metadata?.function || data.proof_function || 'proof');
                proofCard.appendChild(actionsDiv);
                
                // Also add the verification results container
                const resultsDiv = document.createElement('div');
                resultsDiv.className = 'verification-results';
                resultsDiv.id = `verification-results-${proofId}`;
                resultsDiv.innerHTML = '<!-- Verification results will be added here -->';
                proofCard.appendChild(resultsDiv);
            } else {
                console.log('[UPDATE_PROOF_CARD] Actions already present');
            }
        }
        } catch (error) {
            console.error('[UPDATE_PROOF_CARD] Error:', error);
            console.error('[UPDATE_PROOF_CARD] Stack:', error.stack);
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
                verifyBtn.textContent = 'Verifying...';
            }
            
            // Update history table to show verification in progress
            this.updateHistoryTableVerification(proofId, 'verifying');
            
            const response = await fetch(`/api/v1/proof/${proofId}/verify`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.valid) {
                this.localVerifications.set(proofId, result);
                this.uiManager.showToast('Proof verified successfully!', 'success');
                if (verifyBtn) {
                    verifyBtn.textContent = 'Verified';
                    verifyBtn.style.background = 'rgba(16, 185, 129, 0.2)';
                    verifyBtn.style.color = '#10b981';
                }
                // Update history table to show local verification
                this.updateHistoryTableVerification(proofId, 'verified_local');
            } else {
                this.uiManager.showToast('Proof verification failed', 'error');
                if (verifyBtn) {
                    verifyBtn.textContent = 'Invalid';
                    verifyBtn.disabled = false;
                }
                // Update history table to show failure
                this.updateHistoryTableVerification(proofId, 'failed');
            }
            
            // Add verification result to the proof card (if it exists)
            this.addVerificationResult(proofId, 'Local', result);
            
        } catch (error) {
            debugLog(`Error verifying proof: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to verify proof', 'error');
            
            const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
            const verifyBtn = proofCard?.querySelector('.action-btn:nth-child(2)');
            if (verifyBtn) {
                verifyBtn.textContent = 'Verify Locally';
                verifyBtn.disabled = false;
            }
            
            // Update history table to show failure
            this.updateHistoryTableVerification(proofId, 'failed');
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

    addVerificationResult(proofId, type, result, explorerUrl = null) {
        // Check if this is a proof card or just a table row
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"].proof-card`);
        
        // If there's no proof card (only table row), don't add verification results
        // The table will be updated via updateHistoryTableVerification
        if (!proofCard) {
            debugLog(`No proof card found for ${proofId}, skipping verification result display`, 'info');
            return;
        }
        
        const resultsContainer = document.getElementById(`verification-results-${proofId}`);
        if (!resultsContainer) {
            debugLog(`Verification results container not found for ${proofId}`, 'warning');
            // Try to find the proof card and create the container
            if (proofCard && !proofCard.querySelector('.verification-results')) {
                const resultsDiv = document.createElement('div');
                resultsDiv.className = 'verification-results';
                resultsDiv.id = `verification-results-${proofId}`;
                resultsDiv.innerHTML = '<!-- Verification results will be added here -->';
                proofCard.appendChild(resultsDiv);
                // Try again
                this.addVerificationResult(proofId, type, result, explorerUrl);
                return;
            }
            // Don't create fallback cards for workflow proofs
            return;
        }

        const resultDiv = document.createElement('div');
        resultDiv.className = 'verification-result-item';
        resultDiv.innerHTML = `
            <span class="verification-type">${type} Verification</span>
            <span class="status-badge ${result.valid || result.success ? 'verified' : 'error'}">
                ${result.valid || result.success ? 'VALID' : 'INVALID'}
            </span>
            <span class="verification-time">Verified at: ${new Date().toLocaleTimeString()}</span>
            ${explorerUrl ? `
                <a href="${explorerUrl}" target="_blank" class="explorer-link">
                    View on Blockchain
                </a>
            ` : ''}
        `;

        resultsContainer.appendChild(resultDiv);
    }

    getAICommitmentHTML(data) {
        // Always use real commitment data
        const commitmentData = data.commitmentData || data.metadata?.commitmentData;
        
        if (commitmentData && commitmentData.isReal && commitmentData.txHash) {
            // Real blockchain commitment - single line format
            const timestamp = new Date(commitmentData.commitmentTimestamp * 1000).toLocaleString();
            return `
                <div class="commitment-info" style="margin: 8px -8px -8px -8px; padding: 12px; background: #2a2a3a; border-radius: 0 0 4px 4px; border: 1px solid #3a3a4a; border-top: none;">
                    <div style="font-size: 12px; color: #888;">
                        <a href="${commitmentData.baseExplorerUrl}" 
                           target="_blank" 
                           style="color: #0052FF; text-decoration: none;">
                            View AI prediction commitment on Base blockchain
                        </a>
                        <span style="color: #666; margin-left: 8px;">| ${timestamp}</span>
                    </div>
                </div>
            `;
        } else {
            // Waiting for blockchain commitment
            return `
                <div class="commitment-info" style="margin: 8px -8px -8px -8px; padding: 12px; background: #2a2a3a; border-radius: 0 0 4px 4px; border: 1px solid #3a3a4a; border-top: none;">
                    <div style="font-size: 12px; color: #666;">
                        Creating blockchain commitment...
                        <div style="margin-top: 4px; font-size: 11px;">Please approve the transaction in MetaMask</div>
                    </div>
                </div>
            `;
        }
    }

    getMedicalCommitmentHTML(data) {
        // Get medical record data from proof metadata
        console.log('[MEDICAL_COMMITMENT] Looking for medical data in:', {
            direct: !!data.medicalRecordData,
            metadata: !!data.metadata?.medicalRecordData,
            metadataAdditional: !!data.metadata?.additional_context?.medicalRecordData,
            additional: !!data.additional_context?.medicalRecordData,
            fullData: data
        });
        
        const medicalData = data.medicalRecordData || 
                           data.metadata?.medicalRecordData ||
                           data.metadata?.additional_context?.medicalRecordData ||
                           data.additional_context?.medicalRecordData;
        
        console.log('[MEDICAL_COMMITMENT] Found medical data:', medicalData);
        
        if (medicalData && medicalData.transactionHash) {
            // Real Avalanche commitment
            const timestamp = new Date((medicalData.creation_timestamp || medicalData.commitment_timestamp) * 1000).toLocaleString();
            const explorerUrl = `https://testnet.snowtrace.io/tx/${medicalData.transactionHash}`;
            
            return `
                <div class="commitment-info" style="margin: 8px -8px -8px -8px; padding: 12px; background: #2a2a3a; border-radius: 0 0 4px 4px; border: 1px solid #3a3a4a; border-top: none;">
                    <div style="font-size: 12px; color: #888;">
                        <a href="${explorerUrl}" 
                           target="_blank" 
                           style="color: #E84142; text-decoration: none;">
                            View medical record on Avalanche blockchain
                        </a>
                        <span style="color: #666; margin-left: 8px;">| ${timestamp}</span>
                    </div>
                </div>
            `;
        } else if (medicalData && medicalData.status === 'simulated') {
            // Simulated commitment (fallback)
            return `
                <div class="commitment-info" style="margin: 8px -8px -8px -8px; padding: 12px; background: #2a2a3a; border-radius: 0 0 4px 4px; border: 1px solid #3a3a4a; border-top: none;">
                    <div style="font-size: 12px; color: #666;">
                        Medical record created (simulated mode)
                        <div style="margin-top: 4px; font-size: 11px;">Patient ID: ${medicalData.patient_id}</div>
                    </div>
                </div>
            `;
        } else {
            // Waiting for commitment
            return `
                <div class="commitment-info" style="margin: 8px -8px -8px -8px; padding: 12px; background: #2a2a3a; border-radius: 0 0 4px 4px; border: 1px solid #3a3a4a; border-top: none;">
                    <div style="font-size: 12px; color: #666;">
                        Creating medical record on Avalanche...
                        <div style="margin-top: 4px; font-size: 11px;">Please approve the transaction in MetaMask</div>
                    </div>
                </div>
            `;
        }
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

        // Debug log to see what data we're receiving
        console.log('[PROOF_HISTORY_DEBUG] Received proof data:', data);
        console.log('[PROOF_HISTORY_DEBUG] First proof details:', data.proofs[0]);

        const historyContainer = document.createElement('div');
        historyContainer.innerHTML = `
            <h3 style="color: #d1d5db; margin-bottom: 16px; font-weight: 600; font-size: 18px;">
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
        
        // Debug log for specific proof mentioned by user
        if (proofId.includes('1753145819566')) {
            console.log('[VERIFICATION_DEBUG] Found proof_ai_prediction_1753145819566:', proof);
            console.log('[VERIFICATION_DEBUG] Has on_chain_verifications:', !!proof.on_chain_verifications);
            if (proof.on_chain_verifications) {
                console.log('[VERIFICATION_DEBUG] on_chain_verifications data:', proof.on_chain_verifications);
            }
        }
        
        const duration = proof.metrics?.time_ms ? 
            (proof.metrics.time_ms / 1000).toFixed(2) + 's' : 
            proof.metrics?.generation_time_secs ? 
            proof.metrics.generation_time_secs.toFixed(2) + 's' : 'N/A';
            
        const size = proof.metrics?.proof_size || proof.metrics?.file_size_mb ? 
            formatProofSize(proof.metrics.proof_size || proof.metrics.file_size_mb) : 'N/A';
        
        // Check verification status
        let verificationHTML = this.getVerificationStatusHTML(proofId, proof);
        let actionsHTML = this.getProofActionsHTML(proofId, proofFunction, proof.on_chain_verifications);
        
        // Add data attributes for easy updating
        row.setAttribute('data-proof-id', proofId);
        row.setAttribute('data-proof-function', proofFunction);
        
        // Get display name for the proof type
        const displayName = this.getProofTypeDisplayName(proofFunction);
        
        row.innerHTML = `
            <td><span class="function-badge">${displayName}</span></td>
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
        
        // Debug log
        if (proof.on_chain_verifications) {
            console.log('[VERIFICATION_DEBUG] Proof has on_chain_verifications:', proofId, proof.on_chain_verifications);
        }
        
        if (onChainData) {
            const blockchainName = onChainData.blockchain;
            const shortName = blockchainName === 'Ethereum' ? 'ETH' : 
                           blockchainName === 'Solana' ? 'SOL' : 
                           blockchainName === 'Base' ? 'BASE' : blockchainName;
            return `
                <div class="verification-status">
                    <span style="color: #10b981;">✓ ${shortName}</span>
                    <a href="${onChainData.explorerUrl}" target="_blank" class="view-link">
                        View
                    </a>
                </div>
            `;
        }
        
        // Check local verification
        const localVerification = this.localVerifications.get(proofId);
        if (localVerification && localVerification.valid) {
            return '<div class="verification-status"><span style="color: #10b981;">✓ Local</span></div>';
        } else if (proof.verified === true) {
            return '<div class="verification-status"><span style="color: #10b981;">✓ Local</span></div>';
        }
        
        return '<div class="verification-status"><span style="color: #666;">Unverified</span></div>';
    }

    getProofActionsHTML(proofId, proofFunction, hasOnChainVerification) {
        if (!hasOnChainVerification) {
            return `
                <select class="verify-dropdown" onchange="window.handleVerifyAction('${proofId}', '${proofFunction}', this.value); this.value='';">
                    <option value="">Select action...</option>
                    <option value="local">Verify locally</option>
                    <option value="ethereum">Verify on Ethereum</option>
                    <option value="solana">Verify on Solana</option>
                    <option value="base">Verify on Base</option>
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
    
    updateHistoryTableVerification(proofId, status, blockchainData = null) {
        // Find the row in the history table
        const row = document.querySelector(`tr[data-proof-id="${proofId}"]`);
        if (!row) return;
        
        // Get the verification status cell (6th column)
        const verificationCell = row.cells[5];
        if (!verificationCell) return;
        
        // Update verification status based on the status
        if (status === 'verifying') {
            verificationCell.innerHTML = '<div class="verification-status"><span style="color: #f59e0b;">⏳ Verifying...</span></div>';
        } else if (status === 'completed' && blockchainData) {
            // Store the verification data
            this.onChainVerifications.set(proofId, blockchainData);
            
            // Update the cell with blockchain verification info
            const blockchainName = blockchainData.blockchain;
            const shortName = blockchainName === 'Ethereum' ? 'ETH' : 
                           blockchainName === 'Solana' ? 'SOL' : 
                           blockchainName === 'Base' ? 'BASE' : blockchainName;
            
            verificationCell.innerHTML = `
                <div class="verification-status">
                    <span style="color: #10b981;">✓ ${shortName}</span>
                    <a href="${blockchainData.explorerUrl}" target="_blank" class="view-link">
                        View
                    </a>
                </div>
            `;
            
            // Update actions dropdown to remove blockchain option
            const actionsCell = row.cells[6];
            if (actionsCell) {
                const proofFunction = row.getAttribute('data-proof-function');
                actionsCell.innerHTML = this.getProofActionsHTML(proofId, proofFunction, true);
            }
        } else if (status === 'verified_local') {
            verificationCell.innerHTML = '<div class="verification-status"><span style="color: #10b981;">✓ Local</span></div>';
        } else if (status === 'failed') {
            verificationCell.innerHTML = '<div class="verification-status"><span style="color: #ef4444;">✗ Failed</span></div>';
        }
    }
}
// Cache bust: 1752971016
