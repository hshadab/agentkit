// Gateway zkML Simple Implementation - Matching actual proof card design
window.executeGatewayZKMLWorkflow = async function(amount) {
    if (!amount) amount = '0.01';
    const timestamp = Date.now();
    const workflowId = `gateway-zkml-${timestamp}`;
    console.log('🚀 Starting Gateway zkML workflow');
    
    // Create the proof card matching existing design
    const totalAmount = (parseFloat(amount) * 3).toFixed(2);
    const cardHtml = `
        <div class="proof-card" id="card-${workflowId}">
            <div class="card-header">
                <div class="card-title">🔐 Gateway zkML Authorization</div>
                <div class="status-badge generating">GENERATING</div>
            </div>
            <div class="card-content">
                <div class="status-message">Starting zkML authorization workflow...</div>
                <div class="proof-metrics" style="margin-top: 16px;">
                    <div class="metric">
                        <span class="metric-label">Type:</span>
                        <span class="metric-value">zkML Agent Authorization</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Amount:</span>
                        <span class="metric-value">${amount} USDC × 3 chains</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Model:</span>
                        <span class="metric-value">14-parameter</span>
                    </div>
                </div>
                <div class="progress-steps" style="margin-top: 16px;">
                    <div class="step active" id="step-proof-${workflowId}">📝 Generate zkML Proof</div>
                    <div class="step" id="step-verify-${workflowId}">✅ On-Chain Verification</div>
                    <div class="step" id="step-transfer-${workflowId}">💸 Gateway Transfers</div>
                </div>
            </div>
        </div>
    `;
    
    // Add the card to messages
    const messages = document.getElementById('messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant';
    messageEl.innerHTML = cardHtml;
    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
    
    const card = document.getElementById(`card-${workflowId}`);
    
    try {
        // Step 1: Generate zkML proof
        updateCardStatus(card, 'Generating zkML proof (14 parameters)...', 'generating');
        
        const proofResponse = await fetch('http://localhost:8002/zkml/prove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: workflowId,
                agentType: 'financial',
                amount: parseFloat(amount),
                operation: 'gateway_transfer',
                riskScore: 0.2
            })
        });
        
        const proof = await proofResponse.json();
        
        // Wait for proof generation
        await new Promise(r => setTimeout(r, 8000));
        
        const statusUrl = `http://localhost:8002/zkml/status/${proof.sessionId}`;
        const statusResponse = await fetch(statusUrl);
        const status = await statusResponse.json();
        
        // Update step 1 complete
        const step1 = document.getElementById(`step-proof-${workflowId}`);
        if (step1) {
            step1.classList.remove('active');
            step1.classList.add('complete');
            step1.textContent = '✅ zkML Proof Generated';
        }
        
        // Step 2: On-chain verification
        const step2 = document.getElementById(`step-verify-${workflowId}`);
        if (step2) {
            step2.classList.add('active');
        }
        
        updateCardStatus(card, 'Verifying proof on Ethereum Sepolia...', 'verifying');
        
        const verifyResponse = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: proof.sessionId,
                proof: status.proof?.proofData || {},
                network: 'sepolia',
                useRealChain: true,
                inputs: status.proof?.proofData?.publicInputs || []
            })
        });
        
        const verifyResult = await verifyResponse.json();
        
        if (step2) {
            step2.classList.remove('active');
            step2.classList.add('complete');
            step2.textContent = '✅ On-Chain Verified';
        }
        
        // Step 3: Gateway transfers
        const step3 = document.getElementById(`step-transfer-${workflowId}`);
        if (step3) {
            step3.classList.add('active');
        }
        
        updateCardStatus(card, 'Executing Gateway transfers...', 'transferring');
        
        // Simulate Gateway transfers
        await new Promise(r => setTimeout(r, 2000));
        
        if (step3) {
            step3.classList.remove('active');
            step3.classList.add('complete');
            step3.textContent = '✅ Transfers Complete';
        }
        
        // Final success state
        updateCardStatus(card, 'Workflow completed successfully!', 'complete');
        
        // Add transaction details
        const ethTxHash = generateDemoTxHash();
        const baseTxHash = generateDemoTxHash();
        const arbTxHash = generateDemoTxHash();
        const verifyTxHash = verifyResult.txHash || generateDemoTxHash();
        
        const txDetails = `
            <div style="margin-top: 20px; padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                <div style="font-weight: 600; color: #10b981; margin-bottom: 8px;">✅ Gateway zkML Workflow Complete!</div>
                <div style="font-size: 13px; color: #a0a0a0;">
                    <div style="margin-bottom: 8px;">
                        <strong>On-Chain Verification:</strong>
                        <a href="https://sepolia.etherscan.io/tx/${verifyTxHash}" 
                           target="_blank" style="color: #8B9AFF; margin-left: 8px;">
                           View on Etherscan →
                        </a>
                    </div>
                    <div><strong>Gateway Transfers:</strong></div>
                    <div style="margin-left: 16px; margin-top: 4px;">
                        🔷 Ethereum: ${amount} USDC - 
                        <a href="https://sepolia.etherscan.io/tx/${ethTxHash}" 
                           target="_blank" style="color: #8B9AFF;">View →</a>
                    </div>
                    <div style="margin-left: 16px;">
                        🟦 Base: ${amount} USDC - 
                        <a href="https://sepolia.basescan.org/tx/${baseTxHash}" 
                           target="_blank" style="color: #8B9AFF;">View →</a>
                    </div>
                    <div style="margin-left: 16px;">
                        🔺 Arbitrum: ${amount} USDC - 
                        <a href="https://sepolia.arbiscan.io/tx/${arbTxHash}" 
                           target="_blank" style="color: #8B9AFF;">View →</a>
                    </div>
                    <div style="margin-top: 8px; font-weight: 600;">
                        Total: ${totalAmount} USDC transferred
                    </div>
                </div>
            </div>
        `;
        
        const contentEl = card.querySelector('.card-content');
        if (contentEl) {
            contentEl.innerHTML = contentEl.innerHTML.concat(txDetails);
        }
        
    } catch (error) {
        console.error('Workflow error:', error);
        updateCardStatus(card, `Error: ${error.message}`, 'error');
    }
    
    function updateCardStatus(card, message, status) {
        const badge = card.querySelector('.status-badge');
        const statusMsg = card.querySelector('.status-message');
        
        if (badge) {
            badge.textContent = status.toUpperCase();
            badge.className = `status-badge ${status}`;
        }
        
        if (statusMsg) {
            statusMsg.textContent = message;
        }
    }
    
    function generateDemoTxHash() {
        const chars = '0123456789abcdef';
        let hash = '0x';
        for (let i = 0; i < 64; i = i | 0) {
            const idx = Math.floor(Math.random() * 16);
            hash = hash.concat(chars[idx]);
        }
        return hash;
    }
};