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
  constructor(zkpVerifier = null) {
    this.providers = {};
    this.contracts = {};
    this.zkpVerifier = zkpVerifier;
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

      // Validate proof before attempting contract interaction
      if (!proof || !proof.proofId) {
        throw new Error('Invalid proof: missing proofId');
      }

      if (!proof.verified) {
        console.warn('⚠️ Attempting to verify unverified proof on-chain - this may fail');
      }

      // Parse proof data for contract verification - this will throw if proof is not ready
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
    
    // First check if proof is complete and not pending
    if (!proof || !proof.proof || proof.proof === 'PENDING' || typeof proof.proof === 'string' && proof.proof.includes('PENDING')) {
      throw new Error('Proof is not ready - still generating or contains PENDING values');
    }

    // Check if proof.verified is actually true
    if (!proof.verified) {
      throw new Error('Proof verification failed - cannot use unverified proof for contract calls');
    }
    
    try {
      let proofData;
      
      // Handle different proof formats
      if (typeof proof.proof === 'string') {
        try {
          proofData = JSON.parse(proof.proof);
        } catch {
          // If it's not JSON, treat as raw proof data
          console.warn('⚠️ Proof is not in JSON format, using mock proof structure for contract');
          proofData = null;
        }
      } else if (typeof proof.proof === 'object') {
        proofData = proof.proof;
      }
      
      // Validate proof structure for Groth16
      if (proofData && proofData.pi_a && proofData.pi_b && proofData.pi_c) {
        // Real Groth16 proof structure
        return {
          pA: Array.isArray(proofData.pi_a) ? proofData.pi_a.slice(0, 2) : [0, 0],
          pB: Array.isArray(proofData.pi_b) && Array.isArray(proofData.pi_b[0]) ? 
              proofData.pi_b.slice(0, 2) : [[0, 0], [0, 0]],
          pC: Array.isArray(proofData.pi_c) ? proofData.pi_c.slice(0, 2) : [0, 0],
          publicSignals: Array.isArray(proof.publicSignals) ? proof.publicSignals : []
        };
      } else {
        // Generate deterministic mock proof based on proofId for testing
        console.warn('⚠️ Using deterministic mock proof structure for contract calls');
        const seedValue = proof.proofId ? this.hashToNumber(proof.proofId) : 12345;
        
        return {
          pA: [seedValue, seedValue + 1],
          pB: [[seedValue + 2, seedValue + 3], [seedValue + 4, seedValue + 5]],
          pC: [seedValue + 6, seedValue + 7],
          publicSignals: Array.isArray(proof.publicSignals) && proof.publicSignals.length > 0 
            ? proof.publicSignals.slice(0, 3) // Take first 3 public signals
            : [seedValue + 8, 16059075, 1752043847] // deterministic mock signals
        };
      }
      
    } catch (error) {
      console.error('❌ Error parsing proof for contract:', error.message);
      throw new Error(`Failed to parse proof for contract verification: ${error.message}`);
    }
  }

  // Helper method to convert a string to a deterministic number
  hashToNumber(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000000; // Keep it reasonable for contract calls
  }

  // Generate agent authorization proof using zkEngine
  async generateAgentAuthorizationProof(agentId, ownerId, amount, purpose) {
    if (!this.initialized) await this.initialize();

    console.log(`🔐 Generating agent authorization proof...`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Owner: ${ownerId}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Purpose: ${purpose}`);

    try {
      // Try to use real zkEngine if available, otherwise create a deterministic mock
      if (this.zkpVerifier) {
        const proof = await this.zkpVerifier.generateAgentAuthorizationProof(agentId, ownerId, amount, purpose);
        
        // Validate the proof is complete
        if (!proof || !proof.verified || proof.proof === 'PENDING') {
          throw new Error('Proof generation failed or incomplete');
        }
        
        return proof;
      } else {
        // Create deterministic mock proof for testing
        console.warn('⚠️ No zkpVerifier available, creating deterministic mock proof');
        const proofId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const seedValue = this.hashToNumber(agentId + ownerId + amount);
        
        return {
          verified: true,
          proofId: proofId,
          zkEngine: false, // Mark as mock
          publicSignals: [seedValue, Math.floor(amount * 1000000), Date.now()],
          proof: JSON.stringify({
            pi_a: [seedValue, seedValue + 1],
            pi_b: [[seedValue + 2, seedValue + 3], [seedValue + 4, seedValue + 5]],
            pi_c: [seedValue + 6, seedValue + 7]
          }),
          timestamp: new Date().toISOString(),
          mock: true
        };
      }
    } catch (error) {
      console.error(`❌ Failed to generate authorization proof: ${error.message}`);
      throw error;
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