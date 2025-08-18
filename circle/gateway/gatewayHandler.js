import ethers from 'ethers';
import { GATEWAY_CONTRACTS, GATEWAY_CONFIG, getNetworkConfig } from './config.js';

// Minimal ABI for USDC and Gateway contracts
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const GATEWAY_ABI = [
  'function deposit(uint256 amount) payable',
  'function transfer(uint32 destinationDomain, bytes32 recipient, uint256 amount) payable',
  'function balanceOf(address account) view returns (uint256)'
];

export default class GatewayHandler {
  constructor() {
    this.providers = {};
    this.signers = {};
    this.contracts = {};
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
          
          // Initialize USDC contract
          this.contracts[networkKey] = {
            usdc: new ethers.Contract(config.usdc, USDC_ABI, this.signers[networkKey]),
            gateway: config.gatewayWallet ? new ethers.Contract(config.gatewayWallet, GATEWAY_ABI, this.signers[networkKey]) : null
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

  async deposit(network, amount) {
    if (!this.initialized) await this.initialize();

    const networkKey = network.toUpperCase().replace('-', '_');
    const signer = this.signers[networkKey];
    const contracts = this.contracts[networkKey];

    if (!signer || !contracts?.usdc || !contracts?.gateway) {
      throw new Error(`Network ${network} not supported or gateway not deployed`);
    }

    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    const signerAddress = await signer.getAddress();

    console.log(`💰 Depositing ${amount} USDC to Gateway on ${network}`);

    // Check balance
    const balance = await this.getBalance(network);
    if (BigInt(balance.balanceWei) < amountWei) {
      throw new Error(`Insufficient USDC balance. Have: ${balance.balance}, Need: ${amount}`);
    }

    // Check allowance
    const allowance = await contracts.usdc.allowance(signerAddress, contracts.gateway.target);
    if (allowance < amountWei) {
      console.log(`📝 Approving Gateway to spend ${amount} USDC`);
      const approveTx = await contracts.usdc.approve(contracts.gateway.target, amountWei);
      await approveTx.wait();
      console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    }

    // Execute deposit
    console.log(`🏦 Executing deposit...`);
    const depositTx = await contracts.gateway.deposit(amountWei);
    const receipt = await depositTx.wait();

    console.log(`✅ Deposit successful: ${depositTx.hash}`);
    return {
      network,
      amount,
      transactionHash: depositTx.hash,
      blockNumber: receipt.blockNumber
    };
  }

  async transfer(fromNetwork, toNetwork, amount, recipient) {
    if (!this.initialized) await this.initialize();

    const fromNetworkKey = fromNetwork.toUpperCase().replace('-', '_');
    const toNetworkKey = toNetwork.toUpperCase().replace('-', '_');
    
    const fromContracts = this.contracts[fromNetworkKey];
    const toConfig = GATEWAY_CONTRACTS[toNetworkKey];

    if (!fromContracts?.gateway || !toConfig) {
      throw new Error(`Cross-chain transfer not supported between ${fromNetwork} and ${toNetwork}`);
    }

    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Convert recipient address to bytes32 (simplified)
    const recipientBytes32 = ethers.utils.hexZeroPad(recipient, 32);
    
    // Domain mapping (simplified - would need actual Circle domains)
    const domainMap = {
      'ETH_SEPOLIA': 1,
      'BASE_SEPOLIA': 2,
      'AVALANCHE_FUJI': 3
    };

    const destinationDomain = domainMap[toNetworkKey];
    if (!destinationDomain) {
      throw new Error(`Unknown destination domain for ${toNetwork}`);
    }

    console.log(`🌉 Transferring ${amount} USDC from ${fromNetwork} to ${toNetwork}`);
    
    const transferTx = await fromContracts.gateway.transfer(
      destinationDomain,
      recipientBytes32,
      amountWei
    );
    
    const receipt = await transferTx.wait();

    console.log(`✅ Cross-chain transfer initiated: ${transferTx.hash}`);
    
    return {
      fromNetwork,
      toNetwork,
      amount,
      recipient,
      transactionHash: transferTx.hash,
      blockNumber: receipt.blockNumber,
      estimatedFinalization: Date.now() + GATEWAY_CONFIG.finalizationTimeouts[fromNetworkKey]
    };
  }

  async getSupportedNetworks() {
    return Object.keys(GATEWAY_CONTRACTS).map(key => ({
      key,
      name: key.toLowerCase().replace('_', '-'),
      config: GATEWAY_CONTRACTS[key]
    }));
  }

  async getWalletInfo() {
    if (!this.initialized) await this.initialize();

    const walletInfo = {};
    
    for (const [networkKey, signer] of Object.entries(this.signers)) {
      try {
        const address = await signer.getAddress();
        const balance = await this.getBalance(networkKey.toLowerCase().replace('_', '-'));
        
        walletInfo[networkKey] = {
          address,
          usdcBalance: balance.balance,
          network: networkKey.toLowerCase().replace('_', '-')
        };
      } catch (error) {
        walletInfo[networkKey] = { error: error.message };
      }
    }

    return walletInfo;
  }
}