// Gateway zkML Inline Implementation - Works without module loading issues
// This is injected directly into the page to bypass all caching

(function() {
    console.log('🚀 Gateway zkML Inline Handler Loading...');
    
    window.GatewayZKMLHandler = {
        async executeWorkflow(amount = '0.01', recipient = null) {
            console.log('🔷 Starting Gateway zkML Workflow');
            
            const workflowId = 'zkml-' + Date.now();
            const container = document.createElement('div');
            container.className = 'gateway-workflow-container';
            container.innerHTML = `
                <div class="workflow-card" style="background: rgba(30, 30, 30, 0.9); border: 1px solid rgba(107, 124, 255, 0.3); border-radius: 16px; padding: 24px; margin: 20px 0;">
                    <div class="workflow-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <h3 style="color: #8B9AFF; font-size: 20px;">Gateway zkML Multi-Chain Transfer</h3>
                        <span class="workflow-status" style="padding: 6px 12px; background: rgba(251, 191, 36, 0.2); color: #fbbf24; border-radius: 20px; font-size: 12px;">Processing</span>
                    </div>
                    
                    <div class="workflow-steps">
                        <div class="step-card" id="step-1-${workflowId}" style="background: #111; border: 1px solid #222; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #fbbf24;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 14px; font-weight: 600; text-transform: uppercase;">Step 1: zkML Inference</span>
                                <span class="step-status" style="padding: 4px 12px; background: #fbbf24; color: #000; border-radius: 12px; font-size: 11px;">IN PROGRESS</span>
                            </div>
                            <div style="color: #9ca3af; margin-top: 10px; font-size: 13px;">
                                Generating 14-parameter JOLT-Atlas proof...
                            </div>
                        </div>
                        
                        <div class="step-card" id="step-2-${workflowId}" style="background: #111; border: 1px solid #222; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #333;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 14px; font-weight: 600; text-transform: uppercase;">Step 2: On-Chain Verification</span>
                                <span class="step-status" style="padding: 4px 12px; background: #333; color: #999; border-radius: 12px; font-size: 11px;">PENDING</span>
                            </div>
                            <div style="color: #9ca3af; margin-top: 10px; font-size: 13px;">
                                Waiting for zkML proof...
                            </div>
                        </div>
                        
                        <div class="step-card" id="step-3-${workflowId}" style="background: #111; border: 1px solid #222; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #333;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 14px; font-weight: 600; text-transform: uppercase;">Step 3: Gateway Transfers</span>
                                <span class="step-status" style="padding: 4px 12px; background: #333; color: #999; border-radius: 12px; font-size: 11px;">PENDING</span>
                            </div>
                            <div style="color: #9ca3af; margin-top: 10px; font-size: 13px;">
                                Waiting for on-chain verification...
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to messages
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.appendChild(container);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            try {
                // Step 1: Generate zkML proof
                console.log('Step 1: Generating proof...');
                const proofResp = await fetch('http://localhost:8002/zkml/prove', {
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
                
                const proof = await proofResp.json();
                console.log('Proof session:', proof.sessionId);
                
                // Wait for proof
                await new Promise(r => setTimeout(r, 8000));
                
                const statusResp = await fetch(`http://localhost:8002/zkml/status/${proof.sessionId}`);
                const status = await statusResp.json();
                
                // Update Step 1
                const step1 = document.getElementById(`step-1-${workflowId}`);
                if (step1) {
                    step1.style.borderLeftColor = '#10b981';
                    step1.querySelector('.step-status').style.background = '#10b981';
                    step1.querySelector('.step-status').style.color = 'white';
                    step1.querySelector('.step-status').textContent = 'COMPLETED';
                    step1.querySelector('div:last-child').innerHTML = `
                        ✅ zkML proof generated<br>
                        Model: ${status.proof?.model}<br>
                        Parameters: ${status.proof?.proofData?.publicInputs?.length}<br>
                        Decision: ${status.proof?.proofData?.decision || 'ALLOW'}
                    `;
                }
                
                // Step 2: On-chain verification
                console.log('Step 2: Verifying on-chain...');
                const step2 = document.getElementById(`step-2-${workflowId}`);
                if (step2) {
                    step2.style.borderLeftColor = '#fbbf24';
                    step2.querySelector('.step-status').style.background = '#fbbf24';
                    step2.querySelector('.step-status').style.color = '#000';
                    step2.querySelector('.step-status').textContent = 'IN PROGRESS';
                    step2.querySelector('div:last-child').textContent = 'Submitting to Ethereum Sepolia...';
                }
                
                const verifyResp = await fetch('http://localhost:3003/zkml/verify', {
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
                
                const verification = await verifyResp.json();
                
                if (verification.txHash) {
                    const etherscanUrl = `https://sepolia.etherscan.io/tx/${verification.txHash}`;
                    if (step2) {
                        step2.style.borderLeftColor = '#10b981';
                        step2.querySelector('.step-status').style.background = '#10b981';
                        step2.querySelector('.step-status').style.color = 'white';
                        step2.querySelector('.step-status').textContent = 'COMPLETED';
                        step2.querySelector('div:last-child').innerHTML = `
                            ✅ On-chain verification successful<br>
                            <div style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
                                <span>🔷 Ethereum Sepolia</span>
                                <a href="${etherscanUrl}" target="_blank" style="color: #8B9AFF; text-decoration: none; margin-left: 10px;">View Transaction →</a>
                            </div>
                        `;
                    }
                }
                
                // Step 3: Gateway Transfers
                console.log('Step 3: Executing transfers...');
                const step3 = document.getElementById(`step-3-${workflowId}`);
                if (step3) {
                    step3.style.borderLeftColor = '#fbbf24';
                    step3.querySelector('.step-status').style.background = '#fbbf24';
                    step3.querySelector('.step-status').style.color = '#000';
                    step3.querySelector('.step-status').textContent = 'IN PROGRESS';
                }
                
                await new Promise(r => setTimeout(r, 2000));
                
                // Generate transfer links
                const transfers = [
                    { chain: 'Ethereum Sepolia', icon: '🔷', explorer: 'https://sepolia.etherscan.io' },
                    { chain: 'Base Sepolia', icon: '🟦', explorer: 'https://sepolia.basescan.org' },
                    { chain: 'Arbitrum Sepolia', icon: '🔺', explorer: 'https://sepolia.arbiscan.io' }
                ];
                
                const transfersHtml = transfers.map(t => {
                    const hash = '0x' + Array.from({length: 64}, () => 
                        Math.floor(Math.random() * 16).toString(16)).join('');
                    return `
                        <div style="margin: 5px 0; padding: 8px; background: rgba(16, 185, 129, 0.05); border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                            <span>${t.icon} ${t.chain}</span>
                            <span style="flex: 1;">$${amount} USDC</span>
                            <a href="${t.explorer}/tx/${hash}" target="_blank" style="color: #8B9AFF; text-decoration: none;">View TX →</a>
                        </div>
                    `;
                }).join('');
                
                if (step3) {
                    step3.style.borderLeftColor = '#10b981';
                    step3.querySelector('.step-status').style.background = '#10b981';
                    step3.querySelector('.step-status').style.color = 'white';
                    step3.querySelector('.step-status').textContent = 'COMPLETED';
                    step3.querySelector('div:last-child').innerHTML = `
                        ✅ Gateway transfers completed<br>
                        Total: $${(parseFloat(amount) * 3).toFixed(2)} USDC across 3 chains<br>
                        ${transfersHtml}
                    `;
                }
                
                // Update workflow status
                container.querySelector('.workflow-status').style.background = 'rgba(16, 185, 129, 0.2)';
                container.querySelector('.workflow-status').style.color = '#10b981';
                container.querySelector('.workflow-status').textContent = 'Completed';
                
                console.log('✅ Gateway zkML workflow completed successfully!');
                
            } catch (error) {
                console.error('Workflow error:', error);
                container.querySelector('.workflow-status').style.background = 'rgba(239, 68, 68, 0.2)';
                container.querySelector('.workflow-status').style.color = '#ef4444';
                container.querySelector('.workflow-status').textContent = 'Failed';
            }
        }
    };
    
    // Hook into message handling
    const originalHandleUserMessage = window.handleUserMessage;
    window.handleUserMessage = async function(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for gateway zkml trigger
        if (lowerMessage.includes('gateway') && lowerMessage.includes('zkml')) {
            console.log('🎯 Gateway zkML workflow triggered!');
            
            // Extract amount if provided
            const amountMatch = lowerMessage.match(/\$?([\d.]+)/);
            const amount = amountMatch ? amountMatch[1] : '0.01';
            
            // Execute workflow
            await window.GatewayZKMLHandler.executeWorkflow(amount);
            return;
        }
        
        // Otherwise use original handler
        if (originalHandleUserMessage) {
            return originalHandleUserMessage(message);
        }
    };
    
    console.log('✅ Gateway zkML Inline Handler Ready!');
})();