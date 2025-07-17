// Transfer Manager - Handles transfer operations and status updates
import { debugLog, createExplorerLink } from './utils.js';
import { config } from './config.js';

export class TransferManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.transferPollingIntervals = new Map();
        this.transferStates = new Map();
    }

    createTransferStatusElement(transferData) {
        const container = document.createElement('div');
        container.className = 'transfer-status-container';
        container.setAttribute('data-transfer-id', transferData.id);
        
        const status = transferData.status || 'pending';
        const amount = transferData.amount || '0';
        const recipient = transferData.destinationAddress || transferData.recipient || 'Unknown';
        const blockchain = transferData.blockchain || 'Unknown';
        
        container.innerHTML = `
            <div class="transfer-info">
                <div class="transfer-info-item">
                    <strong>Transfer ID:</strong>
                    <span class="transfer-id">${transferData.id}</span>
                </div>
                <div class="transfer-info-item">
                    <strong>Amount:</strong>
                    <span>${amount} USDC</span>
                </div>
                <div class="transfer-info-item">
                    <strong>Recipient:</strong>
                    <span>${recipient}</span>
                </div>
                <div class="transfer-info-item">
                    <strong>Blockchain:</strong>
                    <span>${blockchain}</span>
                </div>
                <div class="transfer-info-item">
                    <strong>Status:</strong>
                    <span class="status-badge ${status === 'complete' ? 'complete' : 'generating'}">
                        ${status.toUpperCase()}
                        ${status === 'pending' ? '<span class="polling-indicator">(checking...)</span>' : ''}
                    </span>
                </div>
            </div>
            
            ${transferData.blockchainTxHash ? `
                <div class="blockchain-status confirmed">
                    <div style="font-weight: 600; margin-bottom: 8px;">
                        ✅ Blockchain Confirmed
                    </div>
                    <div style="font-size: 12px; color: #a0a0a0;">
                        Transaction Hash: <span style="font-family: monospace; color: #8B9AFF;">
                            ${transferData.blockchainTxHash.substring(0, 16)}...
                        </span>
                    </div>
                    <div class="blockchain-link">
                        ${createExplorerLink(transferData)}
                    </div>
                </div>
            ` : status === 'pending' ? `
                <div class="blockchain-status pending">
                    <div style="font-weight: 600;">
                        ⏳ Awaiting Blockchain Confirmation
                    </div>
                </div>
            ` : ''}
        `;
        
        return container;
    }

    updateTransferStatus(transferId, data) {
        debugLog(`Updating transfer status: ${transferId}`, 'info');
        
        const container = document.querySelector(`[data-transfer-id="${transferId}"]`);
        if (!container) {
            debugLog(`Transfer container not found: ${transferId}`, 'warning');
            return;
        }
        
        // Update stored state
        const currentState = this.transferStates.get(transferId) || {};
        const newState = { ...currentState, ...data };
        this.transferStates.set(transferId, newState);
        
        // Update status badge
        const statusBadge = container.querySelector('.status-badge');
        if (statusBadge && data.status) {
            statusBadge.className = `status-badge ${data.status === 'complete' ? 'complete' : 'generating'}`;
            statusBadge.innerHTML = `
                ${data.status.toUpperCase()}
                ${data.status === 'pending' ? '<span class="polling-indicator">(checking...)</span>' : ''}
            `;
        }
        
        // Update blockchain status if transaction hash is available
        if (data.blockchainTxHash && !container.querySelector('.blockchain-status.confirmed')) {
            const pendingStatus = container.querySelector('.blockchain-status.pending');
            if (pendingStatus) {
                pendingStatus.className = 'blockchain-status confirmed';
                pendingStatus.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 8px;">
                        ✅ Blockchain Confirmed
                    </div>
                    <div style="font-size: 12px; color: #a0a0a0;">
                        Transaction Hash: <span style="font-family: monospace; color: #8B9AFF;">
                            ${data.blockchainTxHash.substring(0, 16)}...
                        </span>
                    </div>
                    <div class="blockchain-link">
                        ${createExplorerLink(data)}
                    </div>
                `;
            }
        }
        
        // Stop polling if transfer is complete
        if (data.status === 'complete' || data.status === 'failed') {
            this.stopTransferPolling(transferId);
        }
    }

    async startTransferPolling(transferId, blockchain) {
        debugLog(`Starting transfer polling for ${transferId} on ${blockchain}`, 'info');
        
        // Clear any existing polling
        this.stopTransferPolling(transferId);
        
        const pollTransfer = async () => {
            try {
                const response = await fetch(`/api/v1/transfer/${transferId}/status?blockchain=${blockchain}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Update UI if status changed
                const currentState = this.transferStates.get(transferId);
                if (!currentState || 
                    currentState.status !== data.status || 
                    (!currentState.blockchainTxHash && data.blockchainTxHash)) {
                    
                    this.updateTransferStatus(transferId, data);
                }
                
                // Stop polling if transfer is complete
                if (data.status === 'complete' || data.status === 'failed') {
                    this.stopTransferPolling(transferId);
                    
                    // Show notification
                    if (data.status === 'complete') {
                        this.uiManager.showToast('Transfer completed successfully!', 'success');
                    } else {
                        this.uiManager.showToast('Transfer failed', 'error');
                    }
                }
                
            } catch (error) {
                debugLog(`Error polling transfer ${transferId}: ${error.message}`, 'error');
            }
        };
        
        // Initial poll
        await pollTransfer();
        
        // Set up interval
        const intervalId = setInterval(pollTransfer, config.polling.transferInterval);
        this.transferPollingIntervals.set(transferId, intervalId);
        
        // Stop polling after max duration
        setTimeout(() => {
            this.stopTransferPolling(transferId);
        }, config.polling.maxPollingDuration);
    }

    stopTransferPolling(transferId) {
        const intervalId = this.transferPollingIntervals.get(transferId);
        if (intervalId) {
            clearInterval(intervalId);
            this.transferPollingIntervals.delete(transferId);
            debugLog(`Stopped transfer polling for ${transferId}`, 'info');
        }
    }

    stopAllPolling() {
        this.transferPollingIntervals.forEach((intervalId, transferId) => {
            clearInterval(intervalId);
        });
        this.transferPollingIntervals.clear();
    }

    addTransactionCard(data) {
        const transactionCard = document.createElement('div');
        transactionCard.className = 'transaction-card';
        
        const status = data.status || 'pending';
        const statusText = status === 'complete' ? 'Transaction Complete' : 
                          status === 'pending' ? 'Transaction Pending' : 
                          'Transaction Failed';
        
        transactionCard.innerHTML = `
            <div class="card-header">
                <div class="card-title">${statusText}</div>
                <span class="status-badge ${status}">${status.toUpperCase()}</span>
            </div>
            <div class="card-content">
                ${data.amount ? `
                    <div class="status-message">
                        Amount: ${data.amount} USDC
                    </div>
                ` : ''}
                ${data.recipient || data.destinationAddress ? `
                    <div class="status-message">
                        Recipient: ${data.recipient || data.destinationAddress}
                    </div>
                ` : ''}
                ${data.transactionHash ? `
                    <div class="status-message">
                        Transaction: <a href="${data.explorerUrl || '#'}" target="_blank" 
                                      style="color: #8B9AFF; text-decoration: underline;">
                            ${data.transactionHash.substring(0, 16)}...
                        </a>
                    </div>
                ` : ''}
                ${data.message ? `
                    <div class="status-message">
                        ${data.message}
                    </div>
                ` : ''}
            </div>
        `;
        
        return transactionCard;
    }
}