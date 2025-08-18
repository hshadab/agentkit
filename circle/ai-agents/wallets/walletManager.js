import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { WALLET_CONFIG, generateAgentWalletName, validateSpendingRequest } from './walletConfig.js';
import CCTPHandler from '../cctp/cctpHandler.js';
import dotenv from 'dotenv';
dotenv.config();

// Simple wallet manager for AI agents using Circle's patterns
export default class AIAgentWalletManager {
  constructor() {
    this.apiKey = WALLET_CONFIG.apiKey;
    this.baseUrl = WALLET_CONFIG.baseUrl;
    this.agentWallets = new Map(); // In-memory storage for demo
    this.spendingRecords = new Map(); // Track spending by agent
    this.crossChainTransfers = new Map(); // Track cross-chain transfers
    this.cctp = new CCTPHandler(); // CCTP integration
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (!this.apiKey || this.apiKey === 'your_circle_api_key' || !this.apiKey.startsWith('SAND_API_KEY:')) {
        console.log('⚠️ Circle API key not configured, using managed wallet mode');
        this.simulationMode = false;
        this.managedMode = true;
      } else {
        console.log('✅ AI Agent Wallet Manager initialized with Circle API');
        this.simulationMode = false;
        this.managedMode = false;
      }
      
      // Initialize CCTP for cross-chain capabilities
      await this.cctp.initialize();
      console.log('✅ CCTP cross-chain support enabled for AI agents');
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize wallet manager:', error.message);
      throw error;
    }
  }

  async createAgentWallet(agentType, agentId, blockchain = 'ETH-SEPOLIA') {
    if (!this.initialized) await this.initialize();

    const walletName = generateAgentWalletName(agentType, agentId);
    const agentConfig = WALLET_CONFIG.agentTypes[agentType];
    
    if (!agentConfig) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Use existing Circle wallet infrastructure from your system
    // Check if agent already has a wallet
    const existingWallet = this.agentWallets.get(agentId);
    if (existingWallet) {
      console.log(`💼 Using existing wallet for ${agentType} agent ${agentId}`);
      return existingWallet;
    }

    try {
      // For AI agents, use the existing wallet infrastructure
      // Create a dedicated agent wallet using Circle's developer-controlled wallets
      
      // For now, create a managed wallet reference that uses existing infrastructure
      const agentWallet = {
        id: `agent_${agentId.slice(0, 8)}`,
        name: walletName,
        address: this.generateAgentAddress(agentId), // Deterministic address generation
        blockchain,
        agentType,
        agentId,
        balance: agentConfig.defaultBudget, // Start with default budget
        created: new Date().toISOString(),
        managed: true // Indicates this is managed by the AI agent system
      };

      this.agentWallets.set(agentId, agentWallet);
      this.spendingRecords.set(agentId, {
        dailySpent: '0.00',
        weeklySpent: '0.00', 
        totalSpent: '0.00',
        lastTransaction: null
      });

      console.log(`✅ Created managed wallet for ${agentType} agent ${agentId}`);
      return agentWallet;

    } catch (error) {
      console.error('❌ Failed to create agent wallet:', error.message);
      throw error;
    }
  }

  async getAgentWallet(agentId) {
    return this.agentWallets.get(agentId);
  }

  async getAgentBalance(agentId) {
    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    // For managed wallets, use the stored balance
    // In production, this would query the actual Circle wallet balance
    return {
      agentId,
      balance: wallet.balance,
      currency: 'USDC',
      network: wallet.blockchain,
      address: wallet.address
    };
  }

  async authorizeSpending(agentId, amount, category, purpose) {
    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    // Validate spending request
    const validation = validateSpendingRequest(wallet.agentType, amount, category);
    if (!validation.valid) {
      throw new Error(`Spending not authorized: ${validation.reason}`);
    }

    // Check current balance
    const currentBalance = parseFloat(wallet.balance);
    const requestedAmount = parseFloat(amount);
    
    if (currentBalance < requestedAmount) {
      throw new Error(`Insufficient balance. Available: ${currentBalance} USDC, Requested: ${requestedAmount} USDC`);
    }

    // Create spending authorization
    const authorization = {
      agentId,
      amount,
      category,
      purpose,
      authorizedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
      authId: uuidv4()
    };

    console.log(`✅ Authorized ${amount} USDC spending for agent ${agentId} (${category})`);
    return authorization;
  }

  async executeSpending(agentId, authorization, recipient) {
    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    // Verify authorization is still valid
    if (new Date() > new Date(authorization.expiresAt)) {
      throw new Error('Spending authorization has expired');
    }

    const amount = parseFloat(authorization.amount);
    const currentBalance = parseFloat(wallet.balance);

    // Execute the spending using existing wallet infrastructure
    wallet.balance = (currentBalance - amount).toFixed(2);
    
    const transaction = {
      id: `agent_tx_${uuidv4()}`,
      from: wallet.address,
      to: recipient,
      amount: authorization.amount,
      currency: 'USDC',
      purpose: authorization.purpose,
      category: authorization.category,
      timestamp: new Date().toISOString(),
      status: 'completed',
      agentId: agentId,
      authId: authorization.authId
    };

    // Update spending records
    const spendingRecord = this.spendingRecords.get(agentId);
    spendingRecord.totalSpent = (parseFloat(spendingRecord.totalSpent) + amount).toFixed(2);
    spendingRecord.lastTransaction = transaction;

    console.log(`💸 Agent payment executed: ${authorization.amount} USDC from ${wallet.agentType} agent to ${recipient}`);
    return transaction;
  }

  async getSpendingHistory(agentId) {
    const spendingRecord = this.spendingRecords.get(agentId);
    if (!spendingRecord) return null;

    return {
      agentId,
      ...spendingRecord,
      wallet: this.agentWallets.get(agentId)
    };
  }

  async getAllAgentWallets() {
    const wallets = [];
    for (const [agentId, wallet] of this.agentWallets) {
      const spendingRecord = this.spendingRecords.get(agentId);
      wallets.push({
        ...wallet,
        spending: spendingRecord
      });
    }
    return wallets;
  }

  // Fund agent wallet from master treasury
  async fundAgentWallet(agentId, amount) {
    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    const currentBalance = parseFloat(wallet.balance);
    const fundAmount = parseFloat(amount);
    wallet.balance = (currentBalance + fundAmount).toFixed(2);
    
    console.log(`💰 Funded ${wallet.agentType} agent ${agentId.slice(0, 8)} with ${amount} USDC`);
    return {
      agentId,
      newBalance: wallet.balance,
      funded: amount,
      timestamp: new Date().toISOString()
    };
  }

  // Generate deterministic address for agent
  generateAgentAddress(agentId) {
    // Generate a deterministic address based on agent ID
    // In production, this would be a proper HD wallet derivation
    const hash = this.simpleHash(agentId + 'agent_wallet_derivation');
    return `0x${hash.slice(0, 40)}`;
  }

  simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(40, '0');
  }

  // ===== CCTP CROSS-CHAIN METHODS =====

  // Execute cross-chain USDC transfer with ZKP authorization
  async executeCrossChainTransfer(agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof, urgencyLevel = 'normal') {
    if (!this.initialized) await this.initialize();

    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    console.log(`🌉 AI Agent ${agentId}: Initiating cross-chain transfer`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   From: ${fromNetwork} → To: ${toNetwork}`);
    console.log(`   Urgency: ${urgencyLevel}`);

    try {
      let transfer;
      
      if (urgencyLevel === 'urgent' || urgencyLevel === 'fast') {
        // Use CCTP V2 Fast Transfer for urgent payments
        transfer = await this.cctp.fastTransfer(
          agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof, urgencyLevel
        );
      } else {
        // Standard CCTP transfer
        transfer = await this.cctp.crossChainTransfer(
          agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof
        );
      }

      // Record the cross-chain transfer
      const transferId = `cctp_${uuidv4()}`;
      this.crossChainTransfers.set(transferId, {
        ...transfer,
        transferId,
        agentType: wallet.agentType,
        authorizedAt: new Date().toISOString()
      });

      // Update spending records
      const spendingRecord = this.spendingRecords.get(agentId);
      const numericAmount = parseFloat(amount);
      spendingRecord.totalSpent = (parseFloat(spendingRecord.totalSpent) + numericAmount).toFixed(2);
      spendingRecord.lastTransaction = {
        type: 'cross_chain_transfer',
        transferId,
        amount,
        fromNetwork,
        toNetwork,
        timestamp: transfer.timestamp
      };

      console.log(`✅ Cross-chain transfer completed: ${transfer.burnTx} → ${transfer.mintTx}`);
      return transfer;

    } catch (error) {
      console.error(`❌ Cross-chain transfer failed:`, error.message);
      throw error;
    }
  }

  // Get cross-chain balance across all supported networks
  async getMultiChainBalance(agentId) {
    if (!this.initialized) await this.initialize();

    const wallet = this.agentWallets.get(agentId);
    if (!wallet) throw new Error(`No wallet found for agent ${agentId}`);

    const balances = {};
    const supportedNetworks = ['ethereum-sepolia', 'base-sepolia', 'avalanche-fuji'];

    for (const network of supportedNetworks) {
      try {
        const balance = await this.cctp.getAgentBalance(agentId, network);
        balances[network] = {
          balance: balance.balance,
          address: balance.address,
          network: balance.network
        };
      } catch (error) {
        balances[network] = {
          error: error.message,
          balance: '0.00'
        };
      }
    }

    return {
      agentId,
      agentType: wallet.agentType,
      multiChainBalances: balances,
      totalUSDC: Object.values(balances)
        .filter(b => !b.error)
        .reduce((sum, b) => sum + parseFloat(b.balance), 0).toFixed(2)
    };
  }

  // Get cross-chain transfer history for an agent
  async getCrossChainTransferHistory(agentId) {
    const agentTransfers = [];
    
    for (const [transferId, transfer] of this.crossChainTransfers) {
      if (transfer.agentId === agentId) {
        agentTransfers.push(transfer);
      }
    }

    // Also get on-chain history from CCTP
    try {
      const onChainHistory = await this.cctp.getAgentTransferHistory(agentId);
      return {
        agentId,
        localHistory: agentTransfers,
        onChainHistory,
        totalTransfers: agentTransfers.length
      };
    } catch (error) {
      return {
        agentId,
        localHistory: agentTransfers,
        onChainHistory: [],
        totalTransfers: agentTransfers.length,
        error: error.message
      };
    }
  }

  // Check if cross-chain transfer is needed based on balance distribution
  async shouldRebalanceChains(agentId, targetNetwork, requiredAmount) {
    const multiChainBalance = await this.getMultiChainBalance(agentId);
    const targetBalance = parseFloat(multiChainBalance.multiChainBalances[targetNetwork]?.balance || '0');
    const required = parseFloat(requiredAmount);

    if (targetBalance >= required) {
      return {
        needsRebalance: false,
        targetBalance,
        requiredAmount: required
      };
    }

    // Find best source network for rebalancing
    const otherNetworks = Object.entries(multiChainBalance.multiChainBalances)
      .filter(([network, balance]) => network !== targetNetwork && !balance.error)
      .sort(([,a], [,b]) => parseFloat(b.balance) - parseFloat(a.balance));

    const bestSource = otherNetworks[0];
    if (!bestSource || parseFloat(bestSource[1].balance) < required) {
      return {
        needsRebalance: true,
        canRebalance: false,
        reason: 'Insufficient funds across all networks'
      };
    }

    return {
      needsRebalance: true,
      canRebalance: true,
      sourceNetwork: bestSource[0],
      sourceBalance: bestSource[1].balance,
      targetNetwork,
      targetBalance,
      requiredAmount: required,
      transferAmount: Math.min(parseFloat(bestSource[1].balance), required)
    };
  }

  // Auto-rebalance agent funds across chains for optimal gas and availability
  async autoRebalanceAgent(agentId, targetNetwork, requiredAmount, zkpProof) {
    const rebalanceCheck = await this.shouldRebalanceChains(agentId, targetNetwork, requiredAmount);
    
    if (!rebalanceCheck.needsRebalance) {
      console.log(`💰 Agent ${agentId} already has sufficient balance on ${targetNetwork}`);
      return { rebalanced: false, reason: 'sufficient_balance' };
    }

    if (!rebalanceCheck.canRebalance) {
      throw new Error(rebalanceCheck.reason);
    }

    console.log(`⚖️ Auto-rebalancing agent ${agentId}: ${rebalanceCheck.transferAmount} USDC`);
    console.log(`   ${rebalanceCheck.sourceNetwork} → ${targetNetwork}`);

    const wallet = this.agentWallets.get(agentId);
    const recipientAddress = wallet.address; // Send to same agent on target network

    const transfer = await this.executeCrossChainTransfer(
      agentId,
      rebalanceCheck.sourceNetwork,
      targetNetwork,
      rebalanceCheck.transferAmount,
      recipientAddress,
      zkpProof,
      'fast' // Use fast transfer for rebalancing
    );

    return {
      rebalanced: true,
      transfer,
      originalBalance: rebalanceCheck.targetBalance,
      transferredAmount: rebalanceCheck.transferAmount,
      estimatedNewBalance: (parseFloat(rebalanceCheck.targetBalance) + rebalanceCheck.transferAmount).toFixed(2)
    };
  }

  // Get supported CCTP networks and their status
  async getSupportedCCTPNetworks() {
    if (!this.initialized) await this.initialize();
    return await this.cctp.getSupportedNetworks();
  }
}