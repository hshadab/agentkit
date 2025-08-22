import ethers from 'ethers';
import { GATEWAY_CONTRACTS, GATEWAY_CONFIG, getNetworkConfig } from './config.js';
import GatewayAPI from './gatewayAPI.js';

// Real Circle Gateway contract ABIs
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// Gateway Wallet ABI (for deposits)
const GATEWAY_WALLET_ABI = [
  'function deposit(address token, uint256 amount)',
  'function balanceOf(address account, address token) view returns (uint256)',
  'function withdraw(address token, uint256 amount)',
  'event Deposit(address indexed user, address indexed token, uint256 amount)'
];

// Gateway Minter ABI (for minting on destination)
const GATEWAY_MINTER_ABI = [
  'function mint(bytes calldata attestation, address recipient, uint256 amount)',
  'function mintWithAttestation(bytes calldata attestationData)',
  'event Mint(address indexed recipient, uint256 amount, bytes32 indexed attestationHash)'
];

export default class GatewayHandler {
  constructor() {
    this.providers = {};
    this.signers = {};
    this.contracts = {};
    this.gatewayAPI = new GatewayAPI();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (!GATEWAY_CONFIG.privateKey) {
        throw new Error('GATEWAY_PRIVATE_KEY not found in environment variables');
      }

      // Initialize providers and signers for each network
      for (const [networkKey, config] of Object.entries(GATEWAY_CONTRACTS)) {
        try {
          this.providers[networkKey] = new ethers.providers.JsonRpcProvider(config.rpcUrl);
          this.signers[networkKey] = new ethers.Wallet(GATEWAY_CONFIG.privateKey, this.providers[networkKey]);
          
          // Initialize contracts with real Gateway addresses
          this.contracts[networkKey] = {
            usdc: new ethers.Contract(config.usdc, USDC_ABI, this.signers[networkKey]),
            gatewayWallet: new ethers.Contract(config.gatewayWallet, GATEWAY_WALLET_ABI, this.signers[networkKey]),
            gatewayMinter: new ethers.Contract(config.gatewayMinter, GATEWAY_MINTER_ABI, this.signers[networkKey])
          };

          console.log(`✅ Initialized ${networkKey} provider`);
        } catch (error) {
          console.warn(`⚠️  Failed to initialize ${networkKey}: ${error.message}`);
        }
      }

      this.initialized = true;
      console.log('✅ Gateway Handler initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Gateway Handler:', error.message);
      throw error;
    }
  }

  async getBalance(network, address = null) {
    if (!this.initialized) await this.initialize();

    const networkKey = network.toUpperCase().replace('-', '_');
    const signer = this.signers[networkKey];
    const usdcContract = this.contracts[networkKey]?.usdc;

    if (!signer || !usdcContract) {
      throw new Error(`Network ${network} not supported or not initialized`);
    }

    const accountAddress = address || await signer.getAddress();
    const balance = await usdcContract.balanceOf(accountAddress);
    
    return {
      network,
      address: accountAddress,
      balance: ethers.utils.formatUnits(balance, 6), // USDC has 6 decimals
      balanceWei: balance.toString()
    };
  }

  // Gateway deposit using real Gateway Wallet contract
  async deposit(network, amount) {
    if (!this.initialized) await this.initialize();

    const networkKey = network.toUpperCase().replace('-', '_');
    const signer = this.signers[networkKey];
    const contracts = this.contracts[networkKey];
    const config = GATEWAY_CONTRACTS[networkKey];

    if (!signer || !contracts?.usdc || !contracts?.gatewayWallet) {
      throw new Error(`Network ${network} not supported or gateway not deployed`);
    }

    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    const signerAddress = await signer.getAddress();

    console.log(`💰 Depositing ${amount} USDC to Gateway Wallet on ${network}`);
    console.log(`   Gateway Wallet: ${config.gatewayWallet}`);

    // Check balance
    const balance = await this.getBalance(network);
    if (BigInt(balance.balanceWei) < amountWei) {
      throw new Error(`Insufficient USDC balance. Have: ${balance.balance}, Need: ${amount}`);
    }

    // Check allowance for Gateway Wallet
    const allowance = await contracts.usdc.allowance(signerAddress, config.gatewayWallet);
    if (allowance.lt(amountWei)) {
      console.log(`📝 Approving Gateway Wallet to spend ${amount} USDC`);
      const approveTx = await contracts.usdc.approve(config.gatewayWallet, amountWei);
      await approveTx.wait();
      console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    }

    // Execute Gateway deposit
    console.log(`🏦 Executing Gateway Wallet deposit...`);
    const depositTx = await contracts.gatewayWallet.deposit(config.usdc, amountWei);
    const receipt = await depositTx.wait();

    console.log(`✅ Gateway deposit successful: ${depositTx.hash}`);
    
    // Get updated Gateway balance
    const gatewayBalance = await this.getGatewayBalance(network, signerAddress);
    
    return {
      network,
      amount,
      transactionHash: depositTx.hash,
      blockNumber: receipt.blockNumber,
      gatewayBalance: gatewayBalance.balance,
      type: 'gateway_deposit'
    };
  }

  // Gateway cross-chain transfer using burn intent and attestation
  async transfer(fromNetwork, toNetwork, amount, recipient, zkpProofId = null) {
    if (!this.initialized) await this.initialize();

    const fromNetworkKey = fromNetwork.toUpperCase().replace('-', '_');
    const toNetworkKey = toNetwork.toUpperCase().replace('-', '_');
    
    const fromConfig = GATEWAY_CONTRACTS[fromNetworkKey];
    const toConfig = GATEWAY_CONTRACTS[toNetworkKey];
    const fromSigner = this.signers[fromNetworkKey];

    if (!fromConfig || !toConfig || !fromSigner) {
      throw new Error(`Cross-chain transfer not supported between ${fromNetwork} and ${toNetwork}`);
    }

    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    const signerAddress = await fromSigner.getAddress();

    console.log(`🌉 Gateway cross-chain transfer: ${amount} USDC`);
    console.log(`   From: ${fromNetwork} (domain ${fromConfig.domain})`);
    console.log(`   To: ${toNetwork} (domain ${toConfig.domain})`);
    console.log(`   Recipient: ${recipient}`);
    if (zkpProofId) console.log(`   ZKP Proof: ${zkpProofId}`);

    // Step 1: Execute Gateway API workflow (burn intent + attestation)
    const gatewayResult = await this.gatewayAPI.executeGatewayTransfer({
      sourceWallet: signerAddress,
      amount: amountWei.toString(),
      burnToken: fromConfig.usdc,
      mintRecipient: recipient,
      destinationDomain: toConfig.domain,
      chainId: fromConfig.chainId,
      zkpProofId
    });

    if (!gatewayResult.success) {
      throw new Error(`Gateway transfer failed: ${gatewayResult.error}`);
    }

    // Step 2: Submit attestation to Gateway Minter on destination
    const mintResult = await this.submitAttestationToMinter(
      toNetwork, 
      gatewayResult.attestation,
      recipient,
      amount
    );

    console.log(`✅ Gateway cross-chain transfer completed`);
    
    return {
      fromNetwork,
      toNetwork,
      amount,
      recipient,
      zkpProofId,
      burnIntent: gatewayResult.burnIntent,
      attestationHash: gatewayResult.attestationHash,
      mintTransaction: mintResult.transactionHash,
      mintBlockNumber: mintResult.blockNumber,
      type: 'gateway_transfer',
      estimatedFinalization: Date.now() + 30000 // Gateway is ~30 seconds
    };
  }

  async getSupportedNetworks() {
    return Object.keys(GATEWAY_CONTRACTS).map(key => ({
      key,
      name: key.toLowerCase().replace('_', '-'),
      config: GATEWAY_CONTRACTS[key]
    }));
  }

  // Get Gateway balance for a specific user and token
  async getGatewayBalance(network, userAddress) {
    if (!this.initialized) await this.initialize();

    const networkKey = network.toUpperCase().replace('-', '_');
    const contracts = this.contracts[networkKey];
    const config = GATEWAY_CONTRACTS[networkKey];

    if (!contracts?.gatewayWallet) {
      throw new Error(`Gateway not available on ${network}`);
    }

    try {
      const balance = await contracts.gatewayWallet.balanceOf(userAddress, config.usdc);
      return {
        network,
        userAddress,
        balance: ethers.utils.formatUnits(balance, 6),
        balanceWei: balance.toString(),
        token: 'USDC'
      };
    } catch (error) {
      console.error(`❌ Failed to get Gateway balance on ${network}:`, error.message);
      return { network, userAddress, balance: '0', balanceWei: '0', error: error.message };
    }
  }

  // Submit attestation to Gateway Minter on destination chain
  async submitAttestationToMinter(network, attestation, recipient, amount) {
    const networkKey = network.toUpperCase().replace('-', '_');
    const contracts = this.contracts[networkKey];

    if (!contracts?.gatewayMinter) {
      throw new Error(`Gateway Minter not available on ${network}`);
    }

    console.log(`🪙 Submitting attestation to Gateway Minter on ${network}`);

    try {
      const mintTx = await contracts.gatewayMinter.mintWithAttestation(attestation);
      const receipt = await mintTx.wait();

      console.log(`✅ Gateway mint successful: ${mintTx.hash}`);

      return {
        network,
        recipient,
        amount,
        transactionHash: mintTx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error(`❌ Gateway mint failed on ${network}:`, error.message);
      throw error;
    }
  }

  // Get unified Gateway balance across all networks
  async getUnifiedBalance() {
    if (!this.initialized) await this.initialize();

    const unifiedBalance = {
      totalBalance: '0',
      networks: {}
    };

    let totalWei = ethers.BigNumber.from('0');

    for (const [networkKey, signer] of Object.entries(this.signers)) {
      try {
        const network = networkKey.toLowerCase().replace('_', '-');
        const address = await signer.getAddress();
        const gatewayBalance = await this.getGatewayBalance(network, address);
        
        unifiedBalance.networks[network] = {
          balance: gatewayBalance.balance,
          balanceWei: gatewayBalance.balanceWei
        };

        totalWei = totalWei.add(ethers.BigNumber.from(gatewayBalance.balanceWei));
      } catch (error) {
        unifiedBalance.networks[networkKey] = { error: error.message };
      }
    }

    unifiedBalance.totalBalance = ethers.utils.formatUnits(totalWei, 6);
    unifiedBalance.totalBalanceWei = totalWei.toString();

    return unifiedBalance;
  }

  async getWalletInfo() {
    if (!this.initialized) await this.initialize();

    const walletInfo = {};
    
    for (const [networkKey, signer] of Object.entries(this.signers)) {
      try {
        const address = await signer.getAddress();
        const network = networkKey.toLowerCase().replace('_', '-');
        const balance = await this.getBalance(network);
        const gatewayBalance = await this.getGatewayBalance(network, address);
        
        walletInfo[networkKey] = {
          address,
          network,
          usdcBalance: balance.balance,
          gatewayBalance: gatewayBalance.balance,
          totalBalance: (parseFloat(balance.balance) + parseFloat(gatewayBalance.balance)).toFixed(6)
        };
      } catch (error) {
        walletInfo[networkKey] = { error: error.message };
      }
    }

    return walletInfo;
  }

  // Test Gateway API connection
  async testGatewayConnection() {
    return await this.gatewayAPI.testConnection();
  }
}