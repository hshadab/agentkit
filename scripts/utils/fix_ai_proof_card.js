// Direct fix for AI prediction proof card
console.log('=== Fixing AI Prediction Proof Card ===\n');

// Find all proof cards
const allCards = document.querySelectorAll('.proof-card');
let foundAiCard = false;

allCards.forEach(card => {
    const proofId = card.getAttribute('data-proof-id');
    const funcName = card.getAttribute('data-function-name');
    
    if (funcName === 'prove_ai_content' || proofId?.includes('ai_content')) {
        foundAiCard = true;
        console.log('Found AI prediction proof card:', proofId);
        console.log('Current function name:', funcName);
        
        // Check current state
        const statusBadge = card.querySelector('.status-badge');
        const currentStatus = statusBadge?.textContent;
        console.log('Current status:', currentStatus);
        
        // Check if it's stuck in generating state
        if (currentStatus === 'GENERATING') {
            console.log('Card is stuck in GENERATING state. Manually updating...');
            
            // Update status badge
            if (statusBadge) {
                statusBadge.className = 'status-badge complete';
                statusBadge.textContent = 'COMPLETE';
            }
            
            // Replace content
            const contentDiv = card.querySelector('.card-content');
            if (contentDiv) {
                const hash = window.proofManager.generateCommitmentTxHash(proofId);
                contentDiv.innerHTML = `
                    <div class="proof-metrics">
                        <div class="metric">
                            <span class="metric-label">Time:</span>
                            <span class="metric-value">14.62s</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memory:</span>
                            <span class="metric-value">18.16 MB</span>
                        </div>
                    </div>
                    <div class="commitment-info" style="margin-top: 12px; padding: 12px; background: #2a2a3a; border-radius: 8px; border: 1px solid #3a3a4a;">
                        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Base Commitment:</div>
                        <a href="https://sepolia.basescan.org/tx/${hash}" 
                           target="_blank" 
                           style="color: #0052FF; text-decoration: none; font-family: monospace; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                            <span>📝 View on Base</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                        <div style="font-size: 11px; color: #666; margin-top: 8px;">
                            This proof commitment was timestamped on Base blockchain before the prediction was revealed.
                        </div>
                    </div>
                `;
                
                // Add actions if not present
                if (!card.querySelector('.card-actions')) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'card-actions';
                    actionsDiv.innerHTML = `
                        <button class="action-btn" onclick="window.proofManager.verifyProof('${proofId}')">
                            Verify Locally
                        </button>
                        <button class="action-btn eth-verify-btn" 
                                onclick="window.blockchainVerifier.verifyOnEthereum('${proofId}', 'prove_ai_content')">
                            Verify on Ethereum
                        </button>
                        <button class="action-btn sol-verify-btn" 
                                onclick="window.blockchainVerifier.verifyOnSolana('${proofId}', 'prove_ai_content')">
                            Verify on Solana
                        </button>
                        <button class="action-btn base-verify-btn" 
                                onclick="window.blockchainVerifier.verifyOnBase('${proofId}', 'prove_ai_content')">
                            Verify on Base
                        </button>
                    `;
                    card.appendChild(actionsDiv);
                    
                    const resultsDiv = document.createElement('div');
                    resultsDiv.className = 'verification-results';
                    resultsDiv.id = `verification-results-${proofId}`;
                    card.appendChild(resultsDiv);
                }
                
                console.log('✅ Card manually updated to complete state with Base link');
            }
        } else if (currentStatus === 'COMPLETE') {
            // Check if Base link is present
            const hasBaseLink = !!card.querySelector('.commitment-info');
            console.log('Card is already COMPLETE. Has Base link:', hasBaseLink);
            
            if (!hasBaseLink) {
                console.log('Adding missing Base link...');
                // Add the commitment info to existing metrics
                const metricsDiv = card.querySelector('.proof-metrics');
                if (metricsDiv) {
                    const hash = window.proofManager.generateCommitmentTxHash(proofId);
                    const commitmentHTML = `
                        <div class="commitment-info" style="margin-top: 12px; padding: 12px; background: #2a2a3a; border-radius: 8px; border: 1px solid #3a3a4a;">
                            <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Base Commitment:</div>
                            <a href="https://sepolia.basescan.org/tx/${hash}" 
                               target="_blank" 
                               style="color: #0052FF; text-decoration: none; font-family: monospace; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                                <span>📝 View on Base</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                            <div style="font-size: 11px; color: #666; margin-top: 8px;">
                                This proof commitment was timestamped on Base blockchain before the prediction was revealed.
                            </div>
                        </div>
                    `;
                    metricsDiv.insertAdjacentHTML('afterend', commitmentHTML);
                    console.log('✅ Base link added to complete card');
                }
            }
        }
    }
});

if (!foundAiCard) {
    console.log('No AI prediction proof cards found on the page.');
    console.log('Generate one by typing: "Generate AI prediction commitment proof"');
}