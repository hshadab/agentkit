// VerificationCard Component - SES-safe modular component
// Displays on-chain verification status and results

window.VerificationCard = (function() {
    'use strict';
    
    // Chain configurations
    const CHAINS = {
        'ethereum': {
            name: 'Ethereum Sepolia',
            icon: '⟠',
            explorer: 'https://sepolia.etherscan.io',
            rpc: 'https://eth-sepolia.public.blastapi.io',
            verifierAddress: '0xE2506E6871EAe022608B97d92D5e051210DF684E'
        },
        'base': {
            name: 'Base Sepolia',
            icon: '🔵',
            explorer: 'https://sepolia.basescan.org',
            rpc: 'https://sepolia.base.org',
            verifierAddress: '0x7B3AF414448ba906f02bFbCf7a5e3C4C0d8cA7a2'
        },
        'avalanche': {
            name: 'Avalanche Fuji',
            icon: '🔺',
            explorer: 'https://testnet.snowtrace.io',
            rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
            verifierAddress: '0xMedicalVerifier'
        },
        'iotex': {
            name: 'IoTeX Testnet',
            icon: '🌐',
            explorer: 'https://testnet.iotexscan.io',
            rpc: 'https://babel-api.testnet.iotex.io',
            verifierAddress: '0xProximityVerifier'
        },
        'solana': {
            name: 'Solana Devnet',
            icon: '☀️',
            explorer: 'https://explorer.solana.com',
            rpc: 'https://api.devnet.solana.com',
            verifierAddress: 'GameStateVerifier'
        }
    };
    
    // Verification states
    const STATES = {
        PENDING: 'pending',
        VERIFYING: 'verifying',
        VERIFIED: 'verified',
        FAILED: 'failed',
        EXPIRED: 'expired'
    };
    
    // Create verification card HTML
    function create(verificationData) {
        const chain = verificationData.chain || 'ethereum';
        const chainConfig = CHAINS[chain];
        const cardId = 'verify-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const html = `
            <div class="verification-card" id="${cardId}" data-chain="${chain}">
                <div class="verification-header">
                    <div class="verification-title-row">
                        <span class="chain-icon">${chainConfig.icon}</span>
                        <span class="verification-title">On-Chain Verification</span>
                        <span class="chain-name">${chainConfig.name}</span>
                    </div>
                    <span class="verification-badge ${verificationData.status || 'verifying'}">${formatStatus(verificationData.status || 'verifying')}</span>
                </div>
                
                <div class="verification-content">
                    ${renderVerificationDetails(verificationData, chainConfig)}
                </div>
                
                ${verificationData.txHash ? `
                <div class="transaction-info">
                    <div class="tx-label">Transaction:</div>
                    <a href="${chainConfig.explorer}/tx/${verificationData.txHash}" target="_blank" class="tx-link">
                        ${truncateHash(verificationData.txHash)} ↗
                    </a>
                </div>
                ` : ''}
                
                ${verificationData.blockNumber ? `
                <div class="block-info">
                    <span class="block-label">Block:</span>
                    <a href="${chainConfig.explorer}/block/${verificationData.blockNumber}" target="_blank" class="block-link">
                        #${verificationData.blockNumber}
                    </a>
                </div>
                ` : ''}
                
                <div class="verification-actions">
                    ${renderVerificationActions(verificationData, chain)}
                </div>
            </div>
        `;
        
        return { html, cardId };
    }
    
    // Render verification details
    function renderVerificationDetails(data, chainConfig) {
        if (data.status === STATES.VERIFYING) {
            return `
                <div class="verifying-container">
                    <div class="verification-spinner"></div>
                    <div class="verifying-text">Verifying proof on ${chainConfig.name}...</div>
                    <div class="verifying-substatus">${data.message || 'Submitting to contract...'}</div>
                </div>
            `;
        }
        
        if (data.status === STATES.VERIFIED) {
            return `
                <div class="verified-container">
                    <div class="verified-icon">✅</div>
                    <div class="verified-text">Proof Verified Successfully</div>
                    ${data.verificationTime ? `
                    <div class="verification-metrics">
                        <div class="metric">
                            <span class="metric-label">Verification Time:</span>
                            <span class="metric-value">${data.verificationTime}ms</span>
                        </div>
                        ${data.gasUsed ? `
                        <div class="metric">
                            <span class="metric-label">Gas Used:</span>
                            <span class="metric-value">${formatGas(data.gasUsed)}</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        if (data.status === STATES.FAILED) {
            return `
                <div class="failed-container">
                    <div class="failed-icon">❌</div>
                    <div class="failed-text">Verification Failed</div>
                    <div class="error-message">${data.error || 'Invalid proof'}</div>
                </div>
            `;
        }
        
        return `
            <div class="pending-container">
                <div class="pending-text">Preparing verification...</div>
            </div>
        `;
    }
    
    // Render verification action buttons
    function renderVerificationActions(data, chain) {
        const actions = [];
        const chainConfig = CHAINS[chain];
        
        if (data.status === STATES.VERIFIED) {
            actions.push(`<button class="verify-action-btn" onclick="VerificationCard.viewOnExplorer('${chain}', '${data.txHash}')">View on Explorer</button>`);
            
            if (data.attestation) {
                actions.push(`<button class="verify-action-btn" onclick="VerificationCard.downloadAttestation('${data.attestation}')">Download Attestation</button>`);
            }
        }
        
        if (data.status === STATES.FAILED) {
            actions.push(`<button class="verify-action-btn retry" onclick="VerificationCard.retry('${data.proofId}', '${chain}')">Retry Verification</button>`);
        }
        
        if (data.contractAddress || chainConfig.verifierAddress) {
            const address = data.contractAddress || chainConfig.verifierAddress;
            actions.push(`<button class="verify-action-btn" onclick="VerificationCard.viewContract('${chain}', '${address}')">View Contract</button>`);
        }
        
        return actions.join('');
    }
    
    // Update existing card
    function update(cardId, newData) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        const chain = card.dataset.chain;
        const chainConfig = CHAINS[chain];
        
        // Update badge
        const badge = card.querySelector('.verification-badge');
        if (badge) {
            badge.className = `verification-badge ${newData.status}`;
            badge.textContent = formatStatus(newData.status);
        }
        
        // Update content
        const content = card.querySelector('.verification-content');
        if (content) {
            content.innerHTML = renderVerificationDetails(newData, chainConfig);
        }
        
        // Update transaction info if available
        if (newData.txHash) {
            let txDiv = card.querySelector('.transaction-info');
            if (!txDiv) {
                const contentDiv = card.querySelector('.verification-content');
                txDiv = document.createElement('div');
                txDiv.className = 'transaction-info';
                txDiv.innerHTML = `
                    <div class="tx-label">Transaction:</div>
                    <a href="${chainConfig.explorer}/tx/${newData.txHash}" target="_blank" class="tx-link">
                        ${truncateHash(newData.txHash)} ↗
                    </a>
                `;
                contentDiv.after(txDiv);
            }
        }
        
        // Update actions
        const actionsDiv = card.querySelector('.verification-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = renderVerificationActions(newData, chain);
        }
    }
    
    // Helper functions
    function truncateHash(hash) {
        if (!hash) return '';
        if (hash.length <= 20) return hash;
        return hash.substr(0, 10) + '...' + hash.substr(-10);
    }
    
    function formatStatus(status) {
        return status.replace(/_/g, ' ').toUpperCase();
    }
    
    function formatGas(gas) {
        if (typeof gas === 'string') {
            gas = parseInt(gas);
        }
        return gas.toLocaleString();
    }
    
    // Action handlers
    function viewOnExplorer(chain, txHash) {
        const chainConfig = CHAINS[chain];
        if (chainConfig && txHash) {
            window.open(`${chainConfig.explorer}/tx/${txHash}`, '_blank');
        }
    }
    
    function viewContract(chain, address) {
        const chainConfig = CHAINS[chain];
        if (chainConfig && address) {
            window.open(`${chainConfig.explorer}/address/${address}`, '_blank');
        }
    }
    
    function downloadAttestation(attestation) {
        const blob = new Blob([JSON.stringify(attestation, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attestation-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function retry(proofId, chain) {
        console.log('Retrying verification:', proofId, 'on', chain);
        window.dispatchEvent(new CustomEvent('retryVerification', { 
            detail: { proofId, chain } 
        }));
    }
    
    // Public API
    return {
        create,
        update,
        viewOnExplorer,
        viewContract,
        downloadAttestation,
        retry,
        CHAINS,
        STATES
    };
})();