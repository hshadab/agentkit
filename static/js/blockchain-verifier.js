// Blockchain Verifier - Manages blockchain verification for proofs
import { debugLog } from './utils.js';
import { config } from './config.js';

export class BlockchainVerifier {
    constructor(uiManager, proofManager) {
        this.uiManager = uiManager;
        this.proofManager = proofManager;
        this.ethereumConnected = false;
        this.solanaConnected = false;
        this.ethereumAccount = null;
        this.solanaWallet = null;
        
        // Auto-connect to wallets if previously connected
        this.autoConnect();
    }
    
    async autoConnect() {
        // Check if previously connected to Ethereum
        if (localStorage.getItem('ethereum-connected') === 'true') {
            debugLog('Auto-connecting to Ethereum...', 'info');
            this.connectEthereum();
        } else {
            // Show connect banner if not connected
            const banner = document.getElementById('eth-connect-banner');
            if (banner) banner.style.display = 'flex';
        }
        
        // Check if previously connected to Solana
        if (localStorage.getItem('solana-connected') === 'true') {
            debugLog('Auto-connecting to Solana...', 'info');
            this.connectSolana();
        } else {
            // Show connect banner if not connected
            const banner = document.getElementById('sol-connect-banner');
            if (banner) banner.style.display = 'flex';
        }
    }

    async connectEthereum() {
        debugLog('Connecting to Ethereum wallet...', 'info');
        
        if (typeof window.ethereum === 'undefined') {
            this.uiManager.showToast('Please install MetaMask to verify on Ethereum', 'error');
            return false;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.ethereumAccount = accounts[0];
            this.ethereumConnected = true;
            
            // Check if on correct network (Sepolia)
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== config.blockchain.ethereum.chainId) {
                await this.switchToSepolia();
            }
            
            debugLog(`Connected to Ethereum: ${this.ethereumAccount}`, 'success');
            this.uiManager.showToast('Ethereum wallet connected', 'success');
            
            // Store connection status
            localStorage.setItem('ethereum-connected', 'true');
            
            // Hide connect banner if shown
            const banner = document.getElementById('eth-connect-banner');
            if (banner) banner.style.display = 'none';
            
            // Show wallet status indicator
            const statusIndicator = document.getElementById('eth-wallet-status');
            if (statusIndicator) statusIndicator.style.display = 'inline-block';
            
            return true;
        } catch (error) {
            debugLog(`Ethereum connection error: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to connect Ethereum wallet', 'error');
            return false;
        }
    }

    async switchToSepolia() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: config.blockchain.ethereum.chainId }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: config.blockchain.ethereum.chainId,
                            chainName: 'Sepolia Testnet',
                            nativeCurrency: {
                                name: 'SepoliaETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }],
                    });
                } catch (addError) {
                    debugLog('Error adding Sepolia network', 'error');
                }
            }
        }
    }

    async connectSolana() {
        debugLog('Connecting to Solana wallet...', 'info');
        
        if (!window.solana || !window.solana.isPhantom) {
            this.uiManager.showToast('Please install Phantom wallet to verify on Solana', 'error');
            return false;
        }

        try {
            const resp = await window.solana.connect();
            this.solanaWallet = resp.publicKey.toString();
            this.solanaConnected = true;
            
            debugLog(`Connected to Solana: ${this.solanaWallet}`, 'success');
            this.uiManager.showToast('Solana wallet connected', 'success');
            
            // Store connection status
            localStorage.setItem('solana-connected', 'true');
            
            // Hide connect banner if shown
            const banner = document.getElementById('sol-connect-banner');
            if (banner) banner.style.display = 'none';
            
            // Show wallet status indicator
            const statusIndicator = document.getElementById('sol-wallet-status');
            if (statusIndicator) statusIndicator.style.display = 'inline-block';
            
            return true;
        } catch (error) {
            debugLog(`Solana connection error: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to connect Solana wallet', 'error');
            return false;
        }
    }

    async verifyOnEthereum(proofId, proofType) {
        debugLog(`Starting Ethereum verification for proof ${proofId}`, 'info');
        
        // Check connection
        if (!this.ethereumConnected) {
            const connected = await this.connectEthereum();
            if (!connected) return;
        }
        
        // Update button state
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
        const ethButton = proofCard?.querySelector('.eth-verify-btn');
        if (ethButton) {
            ethButton.disabled = true;
            ethButton.classList.add('verifying');
            ethButton.textContent = '⏳ Verifying on Ethereum...';
        }
        
        try {
            // Call the actual verification function
            const result = await this.verifyOnEthereumActual(proofId, proofType);
            
            if (result.success) {
                // Store verification data
                this.proofManager.onChainVerifications.set(proofId, {
                    blockchain: 'Ethereum',
                    txHash: result.txHash,
                    explorerUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`,
                    timestamp: new Date().toISOString()
                });
                
                this.uiManager.showToast('Proof verified on Ethereum!', 'success');
                
                if (ethButton) {
                    ethButton.textContent = '✅ Verified on Ethereum';
                    ethButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
                    ethButton.disabled = true;
                }
                
                // Add verification result to UI
                this.addVerificationResultCard(proofId, 'Ethereum', result);
            } else {
                throw new Error(result.error || 'Verification failed');
            }
        } catch (error) {
            debugLog(`Ethereum verification error: ${error.message}`, 'error');
            this.uiManager.showToast(`Ethereum verification failed: ${error.message}`, 'error');
            
            if (ethButton) {
                ethButton.textContent = '🔷 Verify on Ethereum';
                ethButton.disabled = false;
                ethButton.classList.remove('verifying');
            }
        }
    }

    async verifyOnEthereumActual(proofId, proofType) {
        // This function should be implemented by the ethereum-verifier.js
        // For now, we'll call the global function if it exists
        if (typeof window.verifyOnEthereumActual === 'function') {
            return await window.verifyOnEthereumActual(proofId, proofType);
        }
        
        throw new Error('Ethereum verifier not loaded');
    }

    async verifyOnSolana(proofId, proofType) {
        debugLog(`Starting Solana verification for proof ${proofId}`, 'info');
        
        // Check connection
        if (!this.solanaConnected) {
            const connected = await this.connectSolana();
            if (!connected) return;
        }
        
        // Update button state
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
        const solButton = proofCard?.querySelector('.sol-verify-btn');
        if (solButton) {
            solButton.disabled = true;
            solButton.classList.add('verifying');
            solButton.textContent = '⏳ Verifying on Solana...';
        }
        
        try {
            // Call the actual verification function
            const result = await this.verifyOnSolanaActual(proofId, proofType);
            
            if (result.success) {
                // Store verification data
                this.proofManager.onChainVerifications.set(proofId, {
                    blockchain: 'Solana',
                    txHash: result.signature,
                    explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
                    timestamp: new Date().toISOString()
                });
                
                this.uiManager.showToast('Proof verified on Solana!', 'success');
                
                if (solButton) {
                    solButton.textContent = '✅ Verified on Solana';
                    solButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
                    solButton.disabled = true;
                }
                
                // Add verification result to UI
                this.addVerificationResultCard(proofId, 'Solana', result);
            } else {
                throw new Error(result.error || 'Verification failed');
            }
        } catch (error) {
            debugLog(`Solana verification error: ${error.message}`, 'error');
            this.uiManager.showToast(`Solana verification failed: ${error.message}`, 'error');
            
            if (solButton) {
                solButton.textContent = '◎ Verify on Solana';
                solButton.disabled = false;
                solButton.classList.remove('verifying');
            }
        }
    }

    async verifyOnSolanaActual(proofId, proofType) {
        // This function should be implemented by the solana-verifier.js
        // For now, we'll call the global function if it exists
        if (typeof window.verifyOnSolanaActual === 'function') {
            return await window.verifyOnSolanaActual(proofId, proofType);
        }
        
        throw new Error('Solana verifier not loaded');
    }

    addVerificationResultCard(proofId, blockchain, result) {
        const card = document.createElement('div');
        card.className = 'verification-card';
        
        const explorerUrl = blockchain === 'Ethereum' 
            ? `https://sepolia.etherscan.io/tx/${result.txHash}`
            : `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${blockchain} Verification Complete</div>
                <span class="status-badge verified">VERIFIED</span>
            </div>
            <div class="card-content">
                <div class="status-message">
                    Proof ID: ${proofId}
                </div>
                <div class="status-message" style="margin-top: 8px;">
                    Transaction: <a href="${explorerUrl}" target="_blank" class="explorer-link">
                        View on ${blockchain === 'Ethereum' ? 'Etherscan' : 'Solana Explorer'} →
                    </a>
                </div>
                <div class="proof-metrics">
                    <div class="metric">
                        <span class="metric-label">Network:</span>
                        <span class="metric-value">${blockchain === 'Ethereum' ? 'Sepolia' : 'Devnet'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Verified at:</span>
                        <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        `;
        
        this.uiManager.addMessage(card, 'assistant');
    }

    // Handler for dropdown actions from proof history
    async handleVerifyAction(proofId, proofFunction, action) {
        switch(action) {
            case 'local':
                await this.proofManager.verifyProof(proofId);
                break;
            case 'ethereum':
                await this.verifyOnEthereum(proofId, proofFunction);
                break;
            case 'solana':
                await this.verifyOnSolana(proofId, proofFunction);
                break;
        }
    }
}