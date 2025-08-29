// ProofCard Component - SES-safe modular component
// Displays proof generation results for any proof type

window.ProofCard = (function() {
    'use strict';
    
    // Proof type configurations
    const PROOF_TYPES = {
        'zkml': {
            title: 'zkML Decision Proof',
            icon: '🤖',
            color: '#6B7CFF',
            metrics: ['parameters', 'generation_time', 'proof_size']
        },
        'kyc': {
            title: 'KYC Compliance Proof',
            icon: '🔐',
            color: '#10b981',
            metrics: ['compliance_level', 'generation_time', 'validity']
        },
        'location': {
            title: 'Location Proximity Proof',
            icon: '📍',
            color: '#3b82f6',
            metrics: ['distance', 'timestamp', 'accuracy']
        },
        'ai_content': {
            title: 'AI Content Authenticity',
            icon: '✨',
            color: '#8b5cf6',
            metrics: ['authenticity_score', 'model_hash', 'timestamp']
        },
        'device': {
            title: 'IoT Device Proof',
            icon: '📡',
            color: '#f59e0b',
            metrics: ['device_id', 'proximity', 'signal_strength']
        },
        'trading': {
            title: 'Trading Decision Proof',
            icon: '📊',
            color: '#ef4444',
            metrics: ['strategy', 'risk_level', 'compliance']
        },
        'medical': {
            title: 'Medical Record Proof',
            icon: '🏥',
            color: '#14b8a6',
            metrics: ['record_hash', 'privacy_level', 'timestamp']
        }
    };
    
    // Create proof card HTML
    function create(proofData) {
        const type = proofData.type || 'zkml';
        const config = PROOF_TYPES[type] || PROOF_TYPES.zkml;
        const cardId = 'proof-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const html = `
            <div class="proof-card" id="${cardId}" data-proof-type="${type}">
                <div class="proof-header">
                    <div class="proof-title-row">
                        <span class="proof-icon">${config.icon}</span>
                        <span class="proof-title">${config.title}</span>
                    </div>
                    <span class="proof-badge ${proofData.status || 'generating'}">${proofData.status || 'GENERATING'}</span>
                </div>
                
                ${proofData.sessionId ? `
                <div class="proof-session">
                    <span class="session-label">Session ID:</span>
                    <span class="session-id">${proofData.sessionId}</span>
                </div>
                ` : ''}
                
                <div class="proof-content">
                    ${renderProofDetails(proofData, config)}
                </div>
                
                ${proofData.proof ? `
                <div class="proof-hash">
                    <div class="hash-label">Proof Hash:</div>
                    <div class="hash-value">${truncateHash(proofData.proof)}</div>
                </div>
                ` : ''}
                
                <div class="proof-actions">
                    ${renderActions(proofData, type)}
                </div>
            </div>
        `;
        
        return { html, cardId };
    }
    
    // Render proof-specific details
    function renderProofDetails(data, config) {
        if (data.status === 'generating') {
            return `
                <div class="proof-generating">
                    <div class="spinner"></div>
                    <span>Generating ${config.title}...</span>
                </div>
            `;
        }
        
        let details = '<div class="proof-metrics">';
        
        // Add metrics based on proof type
        if (data.parameters) {
            details += `<div class="metric">
                <span class="metric-label">Parameters:</span>
                <span class="metric-value">${data.parameters}</span>
            </div>`;
        }
        
        if (data.generation_time) {
            details += `<div class="metric">
                <span class="metric-label">Generation Time:</span>
                <span class="metric-value">${data.generation_time}s</span>
            </div>`;
        }
        
        if (data.proof_size) {
            details += `<div class="metric">
                <span class="metric-label">Proof Size:</span>
                <span class="metric-value">${formatBytes(data.proof_size)}</span>
            </div>`;
        }
        
        // Add custom metrics
        Object.keys(data).forEach(key => {
            if (!['type', 'status', 'sessionId', 'proof', 'parameters', 'generation_time', 'proof_size'].includes(key)) {
                details += `<div class="metric">
                    <span class="metric-label">${formatLabel(key)}:</span>
                    <span class="metric-value">${data[key]}</span>
                </div>`;
            }
        });
        
        details += '</div>';
        return details;
    }
    
    // Render action buttons based on proof type and status
    function renderActions(data, type) {
        const actions = [];
        
        if (data.status === 'complete' || data.proof) {
            actions.push(`<button class="proof-action-btn verify-btn" onclick="ProofCard.verify('${data.sessionId || data.proof}', '${type}')">Verify On-Chain</button>`);
            actions.push(`<button class="proof-action-btn copy-btn" onclick="ProofCard.copyProof('${data.proof}')">Copy Proof</button>`);
            
            if (type === 'zkml') {
                actions.push(`<button class="proof-action-btn gateway-btn" onclick="ProofCard.initiateGateway('${data.sessionId}')">Use with Gateway</button>`);
            }
        }
        
        if (data.status === 'error') {
            actions.push(`<button class="proof-action-btn retry-btn" onclick="ProofCard.retry('${type}', '${JSON.stringify(data.input || {})}')">Retry</button>`);
        }
        
        return actions.join('');
    }
    
    // Update existing card
    function update(cardId, newData) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        const type = card.dataset.proofType;
        const config = PROOF_TYPES[type];
        
        // Update badge
        const badge = card.querySelector('.proof-badge');
        if (badge) {
            badge.className = `proof-badge ${newData.status}`;
            badge.textContent = newData.status.toUpperCase();
        }
        
        // Update content
        const content = card.querySelector('.proof-content');
        if (content) {
            content.innerHTML = renderProofDetails(newData, config);
        }
        
        // Update proof hash if available
        if (newData.proof) {
            let hashDiv = card.querySelector('.proof-hash');
            if (!hashDiv) {
                const contentDiv = card.querySelector('.proof-content');
                hashDiv = document.createElement('div');
                hashDiv.className = 'proof-hash';
                hashDiv.innerHTML = `
                    <div class="hash-label">Proof Hash:</div>
                    <div class="hash-value">${truncateHash(newData.proof)}</div>
                `;
                contentDiv.after(hashDiv);
            }
        }
        
        // Update actions
        const actionsDiv = card.querySelector('.proof-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = renderActions(newData, type);
        }
    }
    
    // Helper functions
    function truncateHash(hash) {
        if (!hash) return '';
        if (hash.length <= 20) return hash;
        return hash.substr(0, 10) + '...' + hash.substr(-10);
    }
    
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    
    function formatLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Action handlers
    function verify(proofId, type) {
        console.log('Verifying proof:', proofId, 'Type:', type);
        // This will be connected to the verification backend
        window.dispatchEvent(new CustomEvent('verifyProof', { 
            detail: { proofId, type } 
        }));
    }
    
    function copyProof(proof) {
        navigator.clipboard.writeText(proof).then(() => {
            console.log('Proof copied to clipboard');
            // Could show a toast notification here
        });
    }
    
    function initiateGateway(sessionId) {
        console.log('Initiating Gateway with session:', sessionId);
        window.dispatchEvent(new CustomEvent('initiateGateway', { 
            detail: { sessionId } 
        }));
    }
    
    function retry(type, inputJson) {
        const input = JSON.parse(inputJson);
        console.log('Retrying proof generation:', type, input);
        window.dispatchEvent(new CustomEvent('retryProof', { 
            detail: { type, input } 
        }));
    }
    
    // Public API
    return {
        create,
        update,
        verify,
        copyProof,
        initiateGateway,
        retry,
        PROOF_TYPES
    };
})();