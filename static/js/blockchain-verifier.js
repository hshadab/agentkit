// Blockchain Verifier - Manages blockchain verification for proofs
import { debugLog } from './utils.js';
import { config } from './config.js';

export class BlockchainVerifier {
    constructor(uiManager, proofManager) {
        this.uiManager = uiManager;
        this.proofManager = proofManager;
        this.ethereumConnected = false;
        this.solanaConnected = false;
        this.baseConnected = false;
        this.ethereumAccount = null;
        this.solanaWallet = null;
        this.baseAccount = null;
        
        // Auto-connect to wallets if previously connected
        this.autoConnect();
    }
    
    async autoConnect() {
        debugLog('Starting auto-connect for all chains...', 'info');
        
        // Auto-connect all chains that were previously connected
        const connections = [];
        let showConnectAll = false;
        
        // Check if previously connected to Ethereum (MetaMask)
        if (localStorage.getItem('ethereum-connected') === 'true') {
            debugLog('Auto-connecting to Ethereum...', 'info');
            connections.push(this.connectEthereum().catch(err => {
                debugLog(`Ethereum auto-connect failed: ${err.message}`, 'warning');
                return false;
            }));
        } else {
            // Show connect banner if not connected
            const banner = document.getElementById('eth-connect-banner');
            if (banner) banner.style.display = 'flex';
            showConnectAll = true;
        }
        
        // Check if previously connected to Solana (Solflare/Phantom)
        if (localStorage.getItem('solana-connected') === 'true') {
            debugLog('Auto-connecting to Solana (with delay)...', 'info');
            // Add delay for Solflare to avoid connection conflicts
            const solanaConnectionPromise = new Promise(async (resolve) => {
                await new Promise(r => setTimeout(r, 1500)); // 1.5 second delay
                try {
                    const result = await this.connectSolana();
                    resolve(result);
                } catch (err) {
                    debugLog(`Solana auto-connect failed: ${err.message}`, 'warning');
                    resolve(false);
                }
            });
            connections.push(solanaConnectionPromise);
        } else {
            // Show connect banner if not connected
            const banner = document.getElementById('sol-connect-banner');
            if (banner) banner.style.display = 'flex';
            showConnectAll = true;
        }
        
        // Check if previously connected to Base (MetaMask)
        if (localStorage.getItem('base-connected') === 'true') {
            debugLog('Auto-connecting to Base...', 'info');
            connections.push(this.connectBase().catch(err => {
                debugLog(`Base auto-connect failed: ${err.message}`, 'warning');
                return false;
            }));
        } else {
            // Show connect banner if not connected
            const banner = document.getElementById('base-connect-banner');
            if (banner) banner.style.display = 'flex';
            showConnectAll = true;
        }
        
        // Wait for all connections to complete
        if (connections.length > 0) {
            const results = await Promise.allSettled(connections);
            const connected = results.filter(r => r.status === 'fulfilled' && r.value).length;
            debugLog(`Auto-connect complete: ${connected}/${connections.length} chains connected`, 'info');
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
        
        // Add small delay to ensure wallet extensions are fully loaded
        if (!window.solflare && !window.solana && !window.phantom) {
            debugLog('Waiting for Solana wallet extensions to load...', 'info');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check for Solflare first, then other wallets
        let wallet = null;
        let walletName = '';
        
        if (window.solflare && window.solflare.isSolflare) {
            wallet = window.solflare;
            walletName = 'Solflare';
            debugLog('Found Solflare wallet', 'info');
        } else if (window.solana && window.solana.isPhantom) {
            wallet = window.solana;
            walletName = 'Phantom';
            debugLog('Found Phantom wallet', 'info');
        } else if (window.solana) {
            wallet = window.solana;
            walletName = 'Solana';
            debugLog('Found generic Solana wallet', 'info');
        }
        
        if (!wallet) {
            debugLog('No Solana wallet found after waiting', 'warning');
            this.uiManager.showToast('Please install Solflare or another Solana wallet to verify on Solana', 'error');
            return false;
        }

        try {
            const resp = await wallet.connect();
            // Handle different response formats from different wallets
            let publicKey;
            if (resp.publicKey) {
                publicKey = resp.publicKey.toString();
            } else if (wallet.publicKey) {
                publicKey = wallet.publicKey.toString();
            } else {
                throw new Error('Could not get public key from wallet');
            }
            
            this.solanaWallet = publicKey;
            this.solanaConnected = true;
            this.connectedWallet = wallet; // Store the wallet instance
            
            debugLog(`Connected to ${walletName}: ${this.solanaWallet}`, 'success');
            
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

    async connectBase() {
        debugLog('Connecting to Base wallet...', 'info');
        
        // Check for any Ethereum wallet
        if (!window.ethereum) {
            this.uiManager.showToast('Please install MetaMask or another Ethereum wallet to verify on Base', 'error');
            return false;
        }

        try {
            const provider = window.ethereum;
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            this.baseAccount = accounts[0];
            this.baseConnected = true;
            
            // Check if on Base network
            const chainId = await provider.request({ method: 'eth_chainId' });
            const baseSepoliaChainId = '0x14a34'; // 84532 in hex
            
            if (chainId !== baseSepoliaChainId) {
                await this.switchToBase();
            }
            
            debugLog(`Connected to Base: ${this.baseAccount}`, 'success');
            
            // Store connection status
            localStorage.setItem('base-connected', 'true');
            
            // Hide connect banner if shown
            const banner = document.getElementById('base-connect-banner');
            if (banner) banner.style.display = 'none';
            
            // Show wallet status indicator
            const statusIndicator = document.getElementById('base-wallet-status');
            if (statusIndicator) statusIndicator.style.display = 'inline-block';
            
            return true;
        } catch (error) {
            debugLog(`Base connection error: ${error.message}`, 'error');
            this.uiManager.showToast('Failed to connect Base wallet', 'error');
            return false;
        }
    }

    async switchToBase() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x14a34' }], // Base Sepolia
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x14a34',
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org']
                        }],
                    });
                } catch (addError) {
                    debugLog('Error adding Base network', 'error');
                }
            }
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
                // Store verification data (handle both txHash and transactionHash)
                const txHash = result.txHash || result.transactionHash;
                const explorerUrl = result.explorerUrl || `https://sepolia.etherscan.io/tx/${txHash}`;
                
                this.proofManager.onChainVerifications.set(proofId, {
                    blockchain: 'Ethereum',
                    txHash: txHash,
                    explorerUrl: explorerUrl,
                    timestamp: new Date().toISOString()
                });
                
                this.uiManager.showToast('Proof verified on Ethereum!', 'success');
                
                if (ethButton) {
                    ethButton.textContent = '✅ Verified on Ethereum';
                    ethButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
                    ethButton.disabled = true;
                }
                
                // Add verification result to the proof card
                this.proofManager.addVerificationResult(proofId, 'Ethereum', result, explorerUrl);
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
                
                // Add verification result to the proof card
                const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
                this.proofManager.addVerificationResult(proofId, 'Solana', result, explorerUrl);
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

    async verifyOnBase(proofId, proofType) {
        debugLog(`Starting Base verification for proof ${proofId}`, 'info');
        
        // Check connection
        if (!this.baseConnected) {
            const connected = await this.connectBase();
            if (!connected) return;
        }
        
        // Update button state
        const proofCard = document.querySelector(`[data-proof-id="${proofId}"]`);
        const baseButton = proofCard?.querySelector('.base-verify-btn');
        if (baseButton) {
            baseButton.disabled = true;
            baseButton.classList.add('verifying');
            baseButton.textContent = '⏳ Verifying on Base...';
        }
        
        try {
            // Call the actual verification function
            const result = await this.verifyOnBaseActual(proofId, proofType);
            
            if (result.success) {
                // Store verification data
                const txHash = result.txHash || result.transactionHash;
                const explorerUrl = result.explorerUrl || `https://sepolia.basescan.org/tx/${txHash}`;
                
                this.proofManager.onChainVerifications.set(proofId, {
                    blockchain: 'Base',
                    txHash: txHash,
                    explorerUrl: explorerUrl,
                    timestamp: new Date().toISOString()
                });
                
                this.uiManager.showToast('Proof verified on Base!', 'success');
                
                if (baseButton) {
                    baseButton.textContent = '✅ Verified on Base';
                    baseButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
                    baseButton.disabled = true;
                }
                
                // Add verification result to the proof card
                this.proofManager.addVerificationResult(proofId, 'Base', result, explorerUrl);
            } else {
                throw new Error(result.error || 'Verification failed');
            }
        } catch (error) {
            debugLog(`Base verification error: ${error.message}`, 'error');
            this.uiManager.showToast(`Base verification failed: ${error.message}`, 'error');
            
            if (baseButton) {
                baseButton.textContent = '🔵 Verify on Base';
                baseButton.disabled = false;
                baseButton.classList.remove('verifying');
            }
        }
    }

    async verifyOnBaseActual(proofId, proofType) {
        // This function should be implemented by the base-verifier.js
        // For now, we'll call the global function if it exists
        if (typeof window.verifyOnBaseActual === 'function') {
            return await window.verifyOnBaseActual(proofId, proofType);
        }
        
        throw new Error('Base verifier not loaded');
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
            case 'base':
                await this.verifyOnBase(proofId, proofFunction);
                break;
        }
    }
    
}