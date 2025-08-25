/**
 * Gateway zkML Integration with Real Proof Generation
 * Uses JOLT-Atlas for cryptographic proof generation
 */

class GatewayZkMLIntegration {
    constructor() {
        this.joltProverPath = '/api/generate-zkml-proof';
        this.privateKey = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
        this.initialized = false;
        this.provider = null;
        this.signer = null;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔐 Initializing Gateway zkML Integration...');
        
        // Setup ethers provider and signer with private key
        if (typeof ethers !== 'undefined') {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = new ethers.Wallet(this.privateKey, this.provider);
            console.log('✅ Signer initialized with address:', await this.signer.getAddress());
        }
        
        this.initialized = true;
    }

    /**
     * Generate real zkML proof for agent authorization
     */
    async generateZkMLProof(agentType, amount, operation, risk) {
        console.log('🧬 Generating REAL zkML proof with JOLT-Atlas...');
        
        const startTime = Date.now();
        
        try {
            // Call backend API to generate real proof
            const response = await fetch(this.joltProverPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_type: agentType,
                    amount: amount,
                    operation: operation,
                    risk: risk,
                    use_minimal_model: true  // Use 3-embedding model for speed
                })
            });
            
            const result = await response.json();
            const proofTime = Date.now() - startTime;
            
            if (result.success) {
                console.log(`✅ Real zkML proof generated in ${proofTime}ms`);
                console.log('   Proof size:', result.proof.length, 'bytes');
                console.log('   Decision:', result.decision ? 'ALLOW' : 'DENY');
                
                return {
                    proof: result.proof,
                    decision: result.decision,
                    proofTime: proofTime,
                    cryptographic: true
                };
            } else {
                console.warn('⚠️ Falling back to mock proof:', result.error);
                return this.generateMockProof(agentType, amount, operation, risk);
            }
        } catch (error) {
            console.error('❌ zkML proof generation failed:', error);
            return this.generateMockProof(agentType, amount, operation, risk);
        }
    }

    /**
     * Fallback mock proof generation
     */
    generateMockProof(agentType, amount, operation, risk) {
        const decision = agentType >= 2 && amount < 50000000 && risk < 30;
        return {
            proof: [decision ? 1 : 0, agentType, amount / 1000000, operation, risk],
            decision: decision,
            proofTime: 5,
            cryptographic: false
        };
    }

    /**
     * Authorize agent with zkML proof
     */
    async authorizeAgent(agentType, amount, operation = 1) {
        await this.initialize();
        
        console.log('🤖 Authorizing agent with zkML...');
        console.log(`   Type: ${agentType}, Amount: ${amount}, Operation: ${operation}`);
        
        // Calculate risk score based on amount
        const risk = amount > 100000000 ? 50 : amount > 50000000 ? 30 : 10;
        
        // Generate zkML proof
        const proofResult = await this.generateZkMLProof(
            agentType,
            Math.floor(amount / 1000000), // Convert to millions
            operation,
            risk
        );
        
        return proofResult;
    }

    /**
     * Execute Gateway transfer with automatic signing
     */
    async executeGatewayTransfer(fromChain, toChain, amount, tokenAddress) {
        await this.initialize();
        
        console.log('💸 Executing Gateway transfer with auto-signing...');
        
        // First authorize the agent
        const agentType = 3; // Cross-chain agent
        const authorization = await this.authorizeAgent(agentType, amount);
        
        if (!authorization.decision) {
            throw new Error('Agent authorization denied by zkML proof');
        }
        
        console.log('✅ Agent authorized with zkML proof');
        console.log(`   Proof type: ${authorization.cryptographic ? 'REAL cryptographic' : 'mock'}`);
        console.log(`   Generation time: ${authorization.proofTime}ms`);
        
        // Now execute the transfer with automatic signing
        try {
            // Get Gateway contract
            const gatewayAddress = this.getGatewayAddress(fromChain);
            const gatewayABI = [
                'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external'
            ];
            
            const gateway = new ethers.Contract(gatewayAddress, gatewayABI, this.signer);
            
            // Approve token spending first
            const tokenABI = ['function approve(address spender, uint256 amount) external returns (bool)'];
            const token = new ethers.Contract(tokenAddress, tokenABI, this.signer);
            
            console.log('📝 Auto-approving token spend...');
            const approveTx = await token.approve(gatewayAddress, amount);
            await approveTx.wait();
            console.log('✅ Token approved');
            
            // Execute deposit
            console.log('🚀 Auto-signing Gateway deposit...');
            const depositTx = await gateway.depositForBurn(
                amount,
                this.getDestinationDomain(toChain),
                ethers.utils.hexZeroPad(this.signer.address, 32),
                tokenAddress
            );
            
            console.log('⏳ Transaction sent:', depositTx.hash);
            const receipt = await depositTx.wait();
            
            console.log('✅ Gateway transfer complete!');
            console.log('   TX Hash:', receipt.transactionHash);
            console.log('   Block:', receipt.blockNumber);
            
            return {
                success: true,
                txHash: receipt.transactionHash,
                zkmlProof: authorization.proof,
                proofType: authorization.cryptographic ? 'real' : 'mock'
            };
            
        } catch (error) {
            console.error('❌ Gateway transfer failed:', error);
            throw error;
        }
    }

    /**
     * Get Gateway contract address for chain
     */
    getGatewayAddress(chain) {
        const addresses = {
            'ethereum': '0x4d8b2e6e5f9b2c3e8a5d1f3c8b7a6e5d4c3b2a1f',  // Sepolia testnet
            'avalanche': '0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5', // Fuji testnet
            'base': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'      // Base Sepolia
        };
        return addresses[chain] || addresses['ethereum'];
    }

    /**
     * Get destination domain for CCTP
     */
    getDestinationDomain(chain) {
        const domains = {
            'ethereum': 0,
            'avalanche': 1,
            'base': 6
        };
        return domains[chain] || 0;
    }

    /**
     * Check USDC balance
     */
    async checkUSDCBalance(address) {
        await this.initialize();
        
        const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
        const usdcABI = ['function balanceOf(address) view returns (uint256)'];
        
        const usdc = new ethers.Contract(usdcAddress, usdcABI, this.provider);
        const balance = await usdc.balanceOf(address || this.signer.address);
        
        const formatted = ethers.utils.formatUnits(balance, 6);
        console.log(`💰 USDC Balance: ${formatted} USDC`);
        
        if (balance.eq(0)) {
            console.warn('⚠️ No USDC balance! You need to:');
            console.warn('   1. Get Sepolia ETH from faucet');
            console.warn('   2. Get Sepolia USDC from Circle faucet');
            console.warn('   3. Or use the test tokens we deployed');
        }
        
        return {
            balance: balance.toString(),
            formatted: formatted,
            hasBalance: !balance.eq(0)
        };
    }
}

// Initialize on load
const gatewayZkML = new GatewayZkMLIntegration();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GatewayZkMLIntegration;
}