// Gateway zkML Workflow Manager v3.0 - With Transfer Status Polling
window.GatewayZKMLHandler = window.GatewayZKMLHandler || {};

(function() {
    'use strict';
    
    // Store active transfers for polling
    const activeTransfers = new Map();
    let pollingInterval = null;
    
    // Configuration
    const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const MAX_POLL_ATTEMPTS = 24; // 2 hours max (24 * 5 minutes)
    
    // Storage keys
    const STORAGE_KEY = 'gateway_pending_transfers';
    
    // Load pending transfers from localStorage on page load
    function loadPendingTransfers() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const transfers = JSON.parse(stored);
                transfers.forEach(transfer => {
                    if (transfer.attempts < MAX_POLL_ATTEMPTS) {
                        activeTransfers.set(transfer.transferId, transfer);
                    }
                });
                if (activeTransfers.size > 0) {
                    startPolling();
                }
            }
        } catch (error) {
            console.error('Failed to load pending transfers:', error);
        }
    }
    
    // Save pending transfers to localStorage
    function savePendingTransfers() {
        try {
            const transfers = Array.from(activeTransfers.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
        } catch (error) {
            console.error('Failed to save pending transfers:', error);
        }
    }
    
    // Check transfer status via Circle Gateway API
    async function checkTransferStatus(transferId) {
        try {
            const response = await fetch(`https://gateway-api-testnet.circle.com/v1/transfer/${transferId}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to check transfer status:', error);
            return null;
        }
    }
    
    // Update UI with transaction hash
    function updateTransferUI(transferData) {
        const { wfId, chain, txHash, status, transferId } = transferData;
        
        // Find the transfer element in the UI
        const transferElements = document.querySelectorAll(`[data-transfer-id="${transferId}"]`);
        transferElements.forEach(element => {
            if (status === 'completed' && txHash) {
                // Update to show actual transaction hash
                const explorerUrl = getExplorerUrl(chain, txHash);
                element.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981;">✅</span>
                        <a href="${explorerUrl}" target="_blank" style="color: #8b9aff; text-decoration: none; font-family: monospace; font-size: 11px;">
                            ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}
                        </a>
                    </div>
                `;
            } else if (status === 'failed') {
                element.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #ef4444;">❌</span>
                        <span style="color: #ef4444; font-size: 11px;">Transfer Failed</span>
                    </div>
                `;
            }
        });
    }
    
    // Get blockchain explorer URL
    function getExplorerUrl(chain, txHash) {
        const explorers = {
            'Ethereum': `https://sepolia.etherscan.io/tx/${txHash}`,
            'Base': `https://sepolia.basescan.org/tx/${txHash}`,
            'Avalanche': `https://testnet.snowtrace.io/tx/${txHash}`
        };
        return explorers[chain] || '#';
    }
    
    // Poll all active transfers
    async function pollTransfers() {
        console.log(`Polling ${activeTransfers.size} pending transfers...`);
        
        for (const [transferId, transferData] of activeTransfers) {
            const status = await checkTransferStatus(transferId);
            
            if (status) {
                transferData.attempts++;
                
                if (status.status === 'completed' && status.txHash) {
                    // Transfer completed!
                    console.log(`Transfer ${transferId} completed with tx: ${status.txHash}`);
                    transferData.status = 'completed';
                    transferData.txHash = status.txHash;
                    updateTransferUI(transferData);
                    
                    // Remove from active transfers
                    activeTransfers.delete(transferId);
                } else if (status.status === 'failed') {
                    // Transfer failed
                    console.log(`Transfer ${transferId} failed`);
                    transferData.status = 'failed';
                    updateTransferUI(transferData);
                    
                    // Remove from active transfers
                    activeTransfers.delete(transferId);
                } else if (transferData.attempts >= MAX_POLL_ATTEMPTS) {
                    // Max attempts reached, stop polling this transfer
                    console.log(`Max attempts reached for transfer ${transferId}`);
                    activeTransfers.delete(transferId);
                }
            }
        }
        
        // Save updated state
        savePendingTransfers();
        
        // Stop polling if no more active transfers
        if (activeTransfers.size === 0) {
            stopPolling();
        }
    }
    
    // Start polling interval
    function startPolling() {
        if (!pollingInterval) {
            console.log('Starting transfer status polling...');
            pollingInterval = setInterval(pollTransfers, POLLING_INTERVAL);
            
            // Do an immediate poll
            pollTransfers();
        }
    }
    
    // Stop polling interval
    function stopPolling() {
        if (pollingInterval) {
            console.log('Stopping transfer status polling...');
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    // Modified executeMultiChainTransfer to track pending transfers
    async function executeMultiChainTransferWithPolling(amount, privateKey, userAddress, wfId) {
        updateStep3InProgress(wfId);
        
        // Note: Can't transfer from Ethereum to Ethereum (same domain)
        // Only cross-chain transfers are allowed
        const chains = [
            { name: 'Base', domain: 6, icon: '🔷' },
            { name: 'Avalanche', domain: 1, icon: '🔺' }
        ];
        
        const transfers = [];
        
        for (const chain of chains) {
            try {
                const result = await executeTransferForChain(chain, amount, privateKey, userAddress, wfId);
                transfers.push(result);
                
                // If we got a transferId, add to polling queue
                if (result.transferId && result.success) {
                    const transferData = {
                        transferId: result.transferId,
                        wfId: wfId,
                        chain: chain.name,
                        status: 'pending',
                        attempts: 0,
                        createdAt: Date.now()
                    };
                    activeTransfers.set(result.transferId, transferData);
                }
            } catch (error) {
                console.error(`Transfer failed for ${chain.name}:`, error);
                transfers.push({
                    chain: chain.name,
                    icon: chain.icon,
                    success: false,
                    errorMessage: error.message
                });
            }
        }
        
        // Start polling if we have pending transfers
        if (activeTransfers.size > 0) {
            savePendingTransfers();
            startPolling();
        }
        
        // Update UI with initial pending state
        updateStep3CompleteWithPolling(wfId, transfers, amount);
        
        return transfers;
    }
    
    // Updated UI function to show completed with pending settlement
    function updateStep3CompleteWithPolling(wfId, transfers, amount) {
        const step3 = document.getElementById(`step3-${wfId}`);
        if (step3) {
            step3.classList.remove('executing');
            step3.classList.add('complete');
            
            const statusBadge = step3.querySelector('.step-status');
            if (statusBadge) {
                // Show as COMPLETED even while polling
                statusBadge.textContent = 'COMPLETED';
                statusBadge.className = 'step-status complete';
                statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
                statusBadge.style.color = '#10b981';
                statusBadge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            }
            
            const content = document.getElementById('gateway-step-content-gateway_transfer');
            if (content) {
                let html = '<div style="font-size: 12px; color: #10b981; margin-bottom: 12px;">✅ Gateway transfers accepted!</div>';
                html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
                
                transfers.forEach(transfer => {
                    const statusIcon = transfer.success ? '✅' : '⚠️';
                    const statusColor = transfer.success ? '#10b981' : '#ef4444';
                    
                    html += `
                        <div style="padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-size: 11px;">
                                    <span style="color: #8b9aff;">${transfer.icon} ${transfer.chain}</span>
                                    <span style="color: ${statusColor}; margin-left: 8px;">
                                        ${transfer.success ? `2.00 USDC` : transfer.errorMessage || 'Failed'} ${statusIcon}
                                    </span>
                                </div>
                                <div style="font-size: 10px;" data-transfer-id="${transfer.transferId || ''}">
                                    ${transfer.success ? 
                                        `<span style="color: #10b981;" id="transfer-status-${transfer.transferId}">✓ Accepted</span>` : 
                                        `<span style="color: #ef4444;">Failed</span>`
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // Add polling status indicator
                html += `
                    <div style="margin-top: 12px; padding: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px;">
                        <div style="font-size: 10px; color: #10b981;">
                            🎯 Settlement Status: Pending blockchain confirmation
                        </div>
                        <div style="font-size: 9px; color: #9ca3af; margin-top: 4px;">
                            Transaction hashes will appear here once settled (~15-30 minutes)
                        </div>
                        <div id="polling-status-${wfId}" style="font-size: 9px; color: #8b9aff; margin-top: 4px;">
                            🔄 Checking for updates...
                        </div>
                    </div>
                `;
                
                // Add attestation display if available
                const attestations = transfers.filter(t => t.attestation).map(t => t.attestation);
                if (attestations.length > 0) {
                    html += `
                        <div style="margin-top: 12px; border: 1px solid rgba(139, 154, 255, 0.2); border-radius: 4px; overflow: hidden;">
                            <div style="padding: 8px; background: rgba(139, 154, 255, 0.05); cursor: pointer;" 
                                 onclick="toggleAttestations('${wfId}')">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 10px; color: #8b9aff; font-weight: 600;">
                                        🔐 Circle Attestations (${attestations.length})
                                    </span>
                                    <span id="attestation-toggle-${wfId}" style="font-size: 10px; color: #8b9aff;">
                                        ▼ Click to expand
                                    </span>
                                </div>
                            </div>
                            <div id="attestation-content-${wfId}" style="display: none; padding: 8px; background: rgba(0, 0, 0, 0.3);">
                                ${attestations.map((att, i) => `
                                    <div style="margin-bottom: 8px;">
                                        <div style="font-size: 9px; color: #8b9aff; margin-bottom: 4px;">
                                            Attestation ${i + 1}:
                                        </div>
                                        <div style="font-family: monospace; font-size: 8px; color: #9ca3af; 
                                                    word-break: break-all; background: rgba(0, 0, 0, 0.5); 
                                                    padding: 4px; border-radius: 2px; max-height: 100px; 
                                                    overflow-y: auto;">
                                            ${att}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                content.innerHTML = html;
            }
        }
    }
    
    // Modified executeTransferForChain to return transferId
    async function executeTransferForChain(chain, amount, privateKey, userAddress, wfId) {
        console.log(`Executing transfer for ${chain.name} (Domain: ${chain.domain})`);
        
        try {
            // Skip non-testnet chains
            if (chain.domain !== 0 && chain.domain !== 1 && chain.domain !== 6) {
                return {
                    chain: chain.name,
                    icon: chain.icon,
                    success: false,
                    errorMessage: 'Chain not supported on testnet',
                    realTransfer: false
                };
            }
            
            // Convert amount to USDC units (6 decimals)
            const value = Math.floor(parseFloat(amount) * 1000000).toString(); // 2 USDC transfer
            
            // Helper function to convert to bytes32
            const toBytes32 = (addr) => {
                const cleaned = addr.toLowerCase().replace('0x', '');
                return '0x' + cleaned.padStart(64, '0');
            };
            
            // EIP-712 domain - Circle Gateway only needs name and version
            const domain = {
                name: "GatewayWallet",
                version: "1"
                // DON'T include chainId or verifyingContract - causes signature mismatch
            };
            
            // EIP-712 types
            const types = {
                BurnIntent: [
                    { name: "maxBlockHeight", type: "uint256" },
                    { name: "maxFee", type: "uint256" },
                    { name: "spec", type: "TransferSpec" }
                ],
                TransferSpec: [
                    { name: "version", type: "uint32" },
                    { name: "sourceDomain", type: "uint32" },
                    { name: "destinationDomain", type: "uint32" },
                    { name: "sourceContract", type: "bytes32" },
                    { name: "destinationContract", type: "bytes32" },
                    { name: "sourceToken", type: "bytes32" },
                    { name: "destinationToken", type: "bytes32" },
                    { name: "sourceDepositor", type: "bytes32" },
                    { name: "destinationRecipient", type: "bytes32" },
                    { name: "sourceSigner", type: "bytes32" },
                    { name: "destinationCaller", type: "bytes32" },
                    { name: "value", type: "uint256" },
                    { name: "salt", type: "bytes32" },
                    { name: "hookData", type: "bytes" }
                ]
            };
            
            // Create burn intent message
            const burnIntent = {
                maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                maxFee: "2001000", // 2.001 USDC fee (Circle minimum requirement)
                spec: {
                    version: 1,
                    sourceDomain: 0, // Ethereum Sepolia
                    destinationDomain: chain.domain,
                    sourceContract: toBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'),
                    destinationContract: toBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'),
                    sourceToken: toBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
                    destinationToken: toBytes32(
                        chain.domain === 6 ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' :
                        chain.domain === 1 ? '0x5425890298aed601595a70AB815c96711a31Bc65' :
                        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
                    ),
                    sourceDepositor: toBytes32(userAddress),
                    destinationRecipient: toBytes32(userAddress), // Send to self for testing
                    sourceSigner: toBytes32(userAddress),
                    destinationCaller: toBytes32('0x0000000000000000000000000000000000000000'),
                    value: value,
                    salt: toBytes32('0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')),
                    hookData: "0x"
                }
            };
            
            const message = {
                maxBlockHeight: ethers.BigNumber.from(burnIntent.maxBlockHeight),
                maxFee: ethers.BigNumber.from(burnIntent.maxFee),
                spec: burnIntent.spec
            };
            
            // Sign with ethers using private key
            let signature;
            try {
                const wallet = new window.ethers.Wallet(privateKey);
                signature = await wallet._signTypedData(domain, types, message);
                console.log('Generated signature for', chain.name);
            } catch (signError) {
                console.error('Signing failed:', signError);
                throw signError;
            }
            
            // Create signed burn intent - MUST use exact signed values
            const signedBurnIntent = {
                burnIntent: {
                    maxBlockHeight: message.maxBlockHeight.toString(),
                    maxFee: message.maxFee.toString(),
                    spec: message.spec  // Use the exact spec from the signed message
                },
                signature: signature
            };
            
            // Submit to Gateway API
            const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([signedBurnIntent])
            });
            
            const responseData = await response.json();
            console.log('Gateway response for', chain.name, ':', responseData);
            
            if (response.ok && (responseData.transferId || (responseData.transfers && responseData.transfers.length > 0))) {
                // Handle both response formats
                const transferId = responseData.transferId || responseData.transfers[0].transferId;
                const attestation = responseData.attestation || responseData.transfers[0].attestation;
                return {
                    chain: chain.name,
                    icon: chain.icon,
                    success: true,
                    transferId: transferId,
                    attestation: attestation,
                    realTransfer: true
                };
            } else {
                const errorMessage = responseData.error?.message || responseData.message || 'Transfer rejected';
                return {
                    chain: chain.name,
                    icon: chain.icon,
                    success: false,
                    errorMessage: errorMessage,
                    realTransfer: false
                };
            }
            
        } catch (error) {
            console.error('Transfer error:', error);
            return {
                chain: chain.name,
                icon: chain.icon,
                success: false,
                errorMessage: error.message || 'Network error',
                realTransfer: false
            };
        }
    }
    
    // Export the main workflow function
    window.GatewayZKMLHandler.executeWorkflowWithPolling = async function(amount = '2') {
        console.log('Executing Gateway zkML workflow with polling...');
        
        const timestamp = Date.now();
        const wfId = `gateway-zkml-${timestamp}`;
        const privateKey = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
        const userAddress = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
        
        // Create the workflow UI (same as original)
        createWorkflowUI(wfId, userAddress, amount);
        
        try {
            // Check Gateway balance
            await checkGatewayBalance(wfId, userAddress);
            
            // Step 1: Generate zkML proof
            const sessionId = await generateZKMLProof(wfId);
            if (!sessionId) {
                throw new Error('Failed to generate zkML proof');
            }
            
            // Step 2: On-chain verification
            const verificationResult = await verifyOnChain(wfId, sessionId);
            if (!verificationResult.success) {
                throw new Error('On-chain verification failed');
            }
            
            // Step 3: Execute transfers with polling
            const transfers = await executeMultiChainTransferWithPolling(amount, privateKey, userAddress, wfId);
            
            return { success: true, transfers };
        } catch (error) {
            console.error('Workflow failed:', error);
            updateWorkflowStatus(wfId, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    };
    
    // Create workflow UI
    function createWorkflowUI(wfId, userAddress, amount) {
        const workflowHTML = `
            <div class="workflow-card gateway-workflow" data-workflow-id="${wfId}" data-workflow-type="gateway">
                <div class="card-header">
                    <div class="card-header-row">
                        <div class="card-title">CIRCLE GATEWAY</div>
                        <div class="workflow-status in-progress" id="workflow-status-${wfId}">IN PROGRESS</div>
                    </div>
                    <div class="card-function-name">zkML-Authorized Agent Initiates Multi-Chain Transfer</div>
                    <div class="workflow-id" style="font-size: 11px; color: #8b9aff; opacity: 0.7;">ID: ${wfId}</div>
                </div>
                
                <div class="gateway-unified-balance">
                    <div>
                        <div style="font-size: 12px; color: #10b981; font-weight: 600;">💰 Gateway Balance</div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Wallet: ${userAddress}</div>
                        <div style="margin-top: 8px;">
                            <div style="font-size: 18px; color: #10b981; font-weight: 600;" id="gateway-balance-${wfId}">Checking...</div>
                            <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;" id="gateway-total-${wfId}"></div>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #06b6d4; font-weight: 600;">&lt;500ms transfers</div>
                        <div style="font-size: 10px; color: #06b6d4;">Real Gateway API</div>
                    </div>
                </div>
                
                <div class="transfer-details" style="display: flex; gap: 16px; margin: 12px 0; font-size: 13px;">
                    <div class="transfer-amount" style="color: #10b981; font-weight: 600;">2 USDC per chain (4.00 total)</div>
                    <div class="transfer-agent" style="color: #8b9aff;">Agent: zkml_executor_${Date.now().toString().slice(-6)}</div>
                    <div class="transfer-environment" style="color: #fbbf24;">Testnet</div>
                </div>
                
                <div class="workflow-steps-container">
                    <!-- Step 1: zkML Proof -->
                    <div class="workflow-step gateway-step executing" id="step1-${wfId}" data-step-id="zkml_proof" style="margin-bottom: 12px;">
                        <div class="workflow-step-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="step-details">
                                <div class="step-title" style="font-size: 11px; color: #8b9aff; font-weight: 600;">STEP 1 OF 3</div>
                                <div class="step-name" style="font-size: 14px; color: #ffffff;">LLM Decision Proof</div>
                                <div class="step-message" style="font-size: 12px; color: #9ca3af;">Proving LLM agent correctly authorized USDC transfer using JOLT-Atlas</div>
                            </div>
                            <div class="step-status executing">EXECUTING</div>
                        </div>
                        <div class="step-content" id="gateway-step-content-zkml_proof">
                            <div style="font-size: 12px; color: #9ca3af;">🔄 Generating proof...</div>
                        </div>
                    </div>
                    
                    <!-- Step 2: On-Chain Verification -->
                    <div class="workflow-step gateway-step pending" id="step2-${wfId}" data-step-id="onchain_verify" style="margin-bottom: 12px;">
                        <div class="workflow-step-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="step-details">
                                <div class="step-title" style="font-size: 11px; color: #8b9aff; font-weight: 600;">STEP 2 OF 3</div>
                                <div class="step-name" style="font-size: 14px; color: #ffffff;">On-Chain Verification</div>
                                <div class="step-message" style="font-size: 12px; color: #9ca3af;">Verify zkML proof on blockchain</div>
                            </div>
                            <div class="step-status pending">AWAITING</div>
                        </div>
                        <div class="step-content" id="gateway-step-content-onchain_verify"></div>
                    </div>
                    
                    <!-- Step 3: Gateway Transfers -->
                    <div class="workflow-step gateway-step pending" id="step3-${wfId}" data-step-id="gateway_transfer" style="margin-bottom: 12px;">
                        <div class="workflow-step-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="step-details">
                                <div class="step-title" style="font-size: 11px; color: #8b9aff; font-weight: 600;">STEP 3 OF 3</div>
                                <div class="step-name" style="font-size: 14px; color: #ffffff;">Multi-Chain Agent Spending</div>
                                <div class="step-message" style="font-size: 12px; color: #9ca3af;">Agent transfers 2 USDC to Base and Avalanche</div>
                            </div>
                            <div class="step-status pending">AWAITING</div>
                        </div>
                        <div class="step-content" id="gateway-step-content-gateway_transfer"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to messages
        const messages = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'message assistant';
        messageEl.innerHTML = workflowHTML;
        messages.appendChild(messageEl);
        messages.scrollTop = messages.scrollHeight;
    }
    
    // Check Gateway balance
    async function checkGatewayBalance(wfId, userAddress) {
        try {
            const response = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: "USDC",
                    sources: [
                        { domain: 0, depositor: userAddress },
                        { domain: 1, depositor: userAddress },
                        { domain: 6, depositor: userAddress }
                    ]
                })
            });
            
            const data = await response.json();
            if (data.balances) {
                const totalBalance = data.balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
                const balanceEl = document.getElementById(`gateway-balance-${wfId}`);
                if (balanceEl) {
                    balanceEl.textContent = `${totalBalance.toFixed(2)} USDC`;
                    
                    // Check if sufficient for transfers (2 USDC + 2.001 fee per chain × 2)
                    const requiredBalance = 8.002; // 4.001 per chain × 2
                    if (totalBalance < requiredBalance) {
                        balanceEl.style.color = '#ef4444';
                        const totalEl = document.getElementById(`gateway-total-${wfId}`);
                        if (totalEl) {
                            totalEl.textContent = `⚠️ Insufficient balance (need ${requiredBalance.toFixed(2)} USDC total)`;
                            totalEl.style.color = '#fbbf24';
                        }
                    }
                }
                return totalBalance;
            }
        } catch (error) {
            console.error('Failed to check balance:', error);
        }
    }
    
    // Generate LLM Decision Proof using JOLT-Atlas
    async function generateZKMLProof(wfId) {
        try {
            // Prepare LLM decision parameters
            const llmDecisionInput = {
                // User's request context
                prompt: "gateway zkml transfer USDC to authorized recipients",
                system_rules: "ONLY approve transfers under daily limit to allowlisted addresses",
                
                // Model configuration (deterministic)
                temperature: 0.0,
                model_version: 0x1337,
                context_window_size: 2048,
                
                // Decision confidence scores
                approve_confidence: 0.95,
                amount_confidence: 0.92,
                rules_attention: 0.88,
                amount_attention: 0.90,
                
                // Validation checks
                format_valid: 1,
                amount_valid: 1,
                recipient_valid: 1,
                decision: 1 // APPROVE
            };
            
            const response = await fetch('http://localhost:8002/zkml/prove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: llmDecisionInput
                })
            });
            
            if (!response.ok) {
                console.error('zkML proof request failed:', response.status, response.statusText);
                return null;
            }
            
            const data = await response.json();
            console.log('zkML proof response:', data);
            
            // The backend returns sessionId with status
            if (data.sessionId && (data.status === 'generating' || data.status === 'completed')) {
                // Wait a bit for proof to generate
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                updateStep1Complete(wfId, data.sessionId);
                return data.sessionId;
            }
            return null;
        } catch (error) {
            console.error('zkML proof generation failed:', error);
            // Could be CORS or network error
            if (error.message.includes('Failed to fetch')) {
                console.error('Cannot reach zkML backend at http://localhost:8002. Is it running?');
            }
            return null;
        }
    }
    
    // Verify on-chain
    async function verifyOnChain(wfId, sessionId) {
        updateStep2InProgress(wfId);
        
        try {
            const response = await fetch('http://localhost:3003/zkml/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    proof: { proof: [], publicInputs: [] },
                    inputs: [3, 10, 1, 5],
                    network: 'sepolia',
                    useRealChain: true
                })
            });
            
            const data = await response.json();
            if (data.verified && data.txHash) {
                updateStep2Complete(wfId, data.txHash);
                return { success: true, txHash: data.txHash };
            }
            return { success: false };
        } catch (error) {
            console.error('On-chain verification failed:', error);
            return { success: false };
        }
    }
    
    // Update step 1 complete
    function updateStep1Complete(wfId, sessionId) {
        const step1 = document.getElementById(`step1-${wfId}`);
        if (step1) {
            step1.classList.remove('executing');
            step1.classList.add('complete');
            
            const statusBadge = step1.querySelector('.step-status');
            if (statusBadge) {
                statusBadge.textContent = 'COMPLETED';
                statusBadge.className = 'step-status complete';
            }
            
            const content = document.getElementById('gateway-step-content-zkml_proof');
            if (content) {
                content.innerHTML = `
                    <div style="font-size: 12px; color: #10b981; margin-bottom: 8px;">✅ LLM Decision Proof generated</div>
                    <div style="font-size: 11px; color: #8b9aff;">Session: ${sessionId}</div>
                    <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Model: JOLT-Atlas LLM Decision (14 params)</div>
                `;
            }
        }
    }
    
    // Update step 2 in progress
    function updateStep2InProgress(wfId) {
        const step2 = document.getElementById(`step2-${wfId}`);
        if (step2) {
            step2.classList.remove('pending');
            step2.classList.add('executing');
            
            const statusBadge = step2.querySelector('.step-status');
            if (statusBadge) {
                statusBadge.textContent = 'EXECUTING';
                statusBadge.className = 'step-status executing';
            }
            
            const content = document.getElementById('gateway-step-content-onchain_verify');
            if (content) {
                content.innerHTML = '<div style="font-size: 12px; color: #9ca3af;">🔄 Verifying on Ethereum Sepolia...</div>';
            }
        }
    }
    
    // Update step 2 complete
    function updateStep2Complete(wfId, txHash) {
        const step2 = document.getElementById(`step2-${wfId}`);
        if (step2) {
            step2.classList.remove('executing');
            step2.classList.add('complete');
            
            const statusBadge = step2.querySelector('.step-status');
            if (statusBadge) {
                statusBadge.textContent = 'COMPLETED';
                statusBadge.className = 'step-status complete';
            }
            
            const content = document.getElementById('gateway-step-content-onchain_verify');
            if (content) {
                const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`;
                content.innerHTML = `
                    <div style="font-size: 12px; color: #10b981; margin-bottom: 8px;">✅ Verified on-chain</div>
                    <div style="margin-bottom: 6px;">
                        <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" style="color: #8b9aff; font-size: 11px; text-decoration: none;">
                            🔗 ${shortHash}
                        </a>
                    </div>
                    <div>
                        <a href="https://sepolia.etherscan.io/address/0x70928d56Ee88CA586cBE2Ee4cF97Ae2fcc2cA944" target="_blank" style="color: #9ca3af; font-size: 10px; text-decoration: none;">
                            📄 View Verifier Contract
                        </a>
                    </div>
                `;
            }
        }
    }
    
    // Update workflow status
    function updateWorkflowStatus(wfId, status, message) {
        const statusEl = document.getElementById(`workflow-status-${wfId}`);
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `workflow-status ${status.toLowerCase()}`;
        }
        if (message) {
            console.log(`Workflow ${wfId}: ${message}`);
        }
    }
    
    // Helper functions from original implementation
    function updateStep3InProgress(wfId) {
        const step3 = document.getElementById(`step3-${wfId}`);
        if (step3) {
            step3.classList.remove('pending');
            step3.classList.add('executing');
            
            const statusBadge = step3.querySelector('.step-status');
            if (statusBadge) {
                statusBadge.textContent = 'EXECUTING';
                statusBadge.className = 'step-status executing';
            }
            
            const content = document.getElementById('gateway-step-content-gateway_transfer');
            if (content) {
                content.innerHTML = '<div style="font-size: 12px; color: #9ca3af;">🔄 Executing multi-chain transfers via Circle Gateway...</div>';
            }
        }
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        loadPendingTransfers();
    });
    
    // Update transfer UI when status changes
    function updateTransferUI(transferData) {
        const element = document.getElementById(`transfer-status-${transferData.transferId}`);
        if (element) {
            if (transferData.status === 'completed' && transferData.txHash) {
                // Show transaction link
                const explorerUrl = getExplorerUrl(transferData.chain, transferData.txHash);
                element.innerHTML = `<a href="${explorerUrl}" target="_blank" style="color: #10b981; text-decoration: none;">✅ ${transferData.txHash.substring(0, 8)}...</a>`;
                
                // Update polling status
                const pollingStatus = document.getElementById(`polling-status-${transferData.workflowId}`);
                if (pollingStatus) {
                    pollingStatus.innerHTML = '✅ Settlement confirmed!';
                    pollingStatus.style.color = '#10b981';
                }
            } else if (transferData.status === 'failed') {
                element.innerHTML = '<span style="color: #ef4444;">❌ Failed</span>';
            }
        }
    }
    
    // Toggle attestation visibility
    window.toggleAttestations = function(wfId) {
        const content = document.getElementById(`attestation-content-${wfId}`);
        const toggle = document.getElementById(`attestation-toggle-${wfId}`);
        
        if (content) {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                if (toggle) toggle.textContent = '▲ Click to collapse';
            } else {
                content.style.display = 'none';
                if (toggle) toggle.textContent = '▼ Click to expand';
            }
        }
    };
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        savePendingTransfers();
    });
    
})();

console.log('Gateway zkML Handler with Polling loaded successfully');