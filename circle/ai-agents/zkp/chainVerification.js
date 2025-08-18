// On-chain verification support for multiple blockchain networks
import ethers from 'ethers';

export const SUPPORTED_CHAINS = {
  ethereum: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
    verifierContract: '0xB511DE43036aCFb3D4Ec84A913c1eCa237f9437E',
    nativeCurrency: 'ETH'
  },
  base: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    verifierContract: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
    nativeCurrency: 'ETH'
  },
  avalanche: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    verifierContract: '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1',
    nativeCurrency: 'AVAX'
  },
  iotex: {
    name: 'IoTeX Testnet',
    chainId: 4690,
    rpcUrl: 'https://babel-api.testnet.iotex.io',
    verifierContract: '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d',
    nativeCurrency: 'IOTX'
  }
};

// Minimal verifier contract ABI for ZKP verification
const VERIFIER_ABI = [
  'function verifyProof(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[] memory _pubSignals) public view returns (bool)',
  'function verifyProofWithMetadata(bytes32 proofId, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[] memory _pubSignals, bytes32 agentId) public returns (bool)',
  'event ProofVerified(bytes32 indexed proofId, bytes32 indexed agentId, bool verified, uint256 timestamp)'
];

export class ChainVerification {
  constructor() {
    this.providers = {};
    this.contracts = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize providers for supported chains
      for (const [chainKey, config] of Object.entries(SUPPORTED_CHAINS)) {
        if (config.rpcUrl) {
          try {
            this.providers[chainKey] = new ethers.providers.JsonRpcProvider(config.rpcUrl);
            
            // Test connection
            await this.providers[chainKey].getNetwork();
            console.log(`✅ Connected to ${config.name}`);

            // Initialize verifier contract if available
            if (config.verifierContract) {
              const wallet = new ethers.Wallet(
                process.env.PRIVATE_KEY,
                this.providers[chainKey]
              );
              
              this.contracts[chainKey] = new ethers.Contract(
                config.verifierContract,
                VERIFIER_ABI,
                wallet
              );
              
              console.log(`✅ Verifier contract initialized on ${config.name}`);
            } else {
              console.log(`⚠️ No verifier contract configured for ${config.name}`);
            }

          } catch (error) {
            console.warn(`⚠️ Failed to connect to ${config.name}: ${error.message}`);
          }
        }
      }

      this.initialized = true;
      console.log('✅ Multi-chain verification system initialized');

    } catch (error) {
      console.error('❌ Failed to initialize chain verification:', error.message);
      throw error;
    }
  }

  async verifyProofOnChain(proof, targetChain = 'ethereum', agentId = null) {
    if (!this.initialized) await this.initialize();

    const chainConfig = SUPPORTED_CHAINS[targetChain];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${targetChain}`);
    }

    const contract = this.contracts[targetChain];
    if (!contract) {
      throw new Error(`No verifier contract available for ${targetChain}`);
    }

    try {
      console.log(`🔍 Verifying proof ${proof.proofId} on ${chainConfig.name}...`);

      // Parse proof data for contract verification
      const proofData = this.parseProofForContract(proof);
      
      let verified;
      if (agentId) {
        // Verify with metadata (stores proof on-chain)
        const tx = await contract.verifyProofWithMetadata(
          proof.proofId,
          proofData.pA,
          proofData.pB,
          proofData.pC,
          proofData.publicSignals,
          ethers.utils.formatBytes32String(agentId)
        );
        
        const receipt = await tx.wait();
        console.log(`📝 Proof verification recorded on-chain: ${tx.hash}`);
        
        // Check for verification event
        const event = receipt.events?.find(e => e.event === 'ProofVerified');
        verified = event ? event.args.verified : false;
        
      } else {
        // View-only verification (no state change)
        verified = await contract.verifyProof(
          proofData.pA,
          proofData.pB,
          proofData.pC,
          proofData.publicSignals
        );
      }

      console.log(`${verified ? '✅' : '❌'} Proof verification on ${chainConfig.name}: ${verified ? 'VERIFIED' : 'FAILED'}`);

      return {
        verified,
        chain: targetChain,
        chainId: chainConfig.chainId,
        proofId: proof.proofId,
        transactionHash: agentId ? tx?.hash : null,
        blockNumber: agentId ? tx?.blockNumber : null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ On-chain verification failed on ${chainConfig.name}:`, error.message);
      throw error;
    }
  }

  parseProofForContract(proof) {
    // Parse zkEngine proof format for smart contract verification
    // This would need to match the specific proof format from your zkEngine
    
    try {
      const proofData = JSON.parse(proof.proof);
      
      return {
        pA: proofData.pi_a || [0, 0],
        pB: proofData.pi_b || [[0, 0], [0, 0]],
        pC: proofData.pi_c || [0, 0],
        publicSignals: proof.publicSignals || []
      };
      
    } catch (error) {
      // Fallback parsing for different proof formats
      console.warn('⚠️ Using fallback proof parsing');
      return {
        pA: [0, 0],
        pB: [[0, 0], [0, 0]],
        pC: [0, 0],
        publicSignals: []
      };
    }
  }

  async getVerificationHistory(proofId, targetChain = 'ethereum') {
    if (!this.initialized) await this.initialize();

    const contract = this.contracts[targetChain];
    if (!contract) {
      throw new Error(`No verifier contract available for ${targetChain}`);
    }

    try {
      // Query past verification events
      const filter = contract.filters.ProofVerified(proofId);
      const events = await contract.queryFilter(filter, -1000); // Last 1000 blocks

      return events.map(event => ({
        proofId: event.args.proofId,
        agentId: ethers.utils.parseBytes32String(event.args.agentId),
        verified: event.args.verified,
        timestamp: new Date(event.args.timestamp.toNumber() * 1000).toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }));

    } catch (error) {
      console.error('❌ Failed to query verification history:', error.message);
      return [];
    }
  }

  async getSupportedChains() {
    return Object.keys(SUPPORTED_CHAINS).map(key => ({
      key,
      ...SUPPORTED_CHAINS[key],
      connected: !!this.providers[key],
      hasVerifier: !!this.contracts[key]
    }));
  }

  async getChainStatus(targetChain) {
    const provider = this.providers[targetChain];
    if (!provider) return null;

    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      return {
        chain: targetChain,
        chainId: network.chainId,
        blockNumber,
        connected: true,
        hasVerifier: !!this.contracts[targetChain]
      };
      
    } catch (error) {
      return {
        chain: targetChain,
        connected: false,
        error: error.message
      };
    }
  }
}