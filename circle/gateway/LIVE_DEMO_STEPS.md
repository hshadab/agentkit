# 🚀 Live Gateway Demo: Exact Steps

## **Goal: Execute ZKP Agent Authorization + 7-Chain Gateway Demo**

**Total Cost: ~$15 (0.35 USDC + gas fees)**  
**Time Required: 15-20 minutes**  
**Result: Real money across 7 chains triggered by agent authorization**

---

## 📋 **Step-by-Step Instructions**

### **1. Get USDC for Demo (Choose One Method)**

#### **Option A: Circle Faucet (Testnet - FREE)**
```bash
# Visit Circle's testnet faucet
# https://faucet.circle.com/
# Get testnet USDC for Sepolia/Base Sepolia
# Limited to 3 chains but completely free
```

#### **Option B: Buy USDC (Mainnet - $1)**
```bash
# Buy 1 USDC on any exchange (Coinbase, Binance, etc.)
# Send to your wallet: 0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87
# Need ~$5-10 ETH for gas fees
```

#### **Option C: Use Circle Wallet Balance**
```bash
# Check your existing Circle wallets
# Transfer USDC to your MetaMask wallet
# Use Circle dashboard: https://console.circle.com/wallets
```

### **2. Fund Gateway Wallet**

```bash
# Navigate to gateway folder
cd /home/hshadab/agentkit/circle/gateway

# Check current status
node fund-gateway-wallet.js --help

# Execute funding (will guide you through)
node fund-gateway-wallet.js
```

**What this does:**
- ✅ Checks your USDC balance
- ✅ Approves Gateway wallet to spend USDC  
- ✅ Deposits 1 USDC to Gateway wallet
- ✅ Verifies deposit successful

### **3. Test Demo (Dry Run)**

```bash
# Run demo without executing transfers
node demo-agent-authorization.js

# Should show:
# ✅ Gateway API connected
# ✅ All 7 networks available  
# ✅ ZKP authorization proof generated
# ✅ Agent verification passed
# ✅ Ready for live execution
```

### **4. Execute Live Demo**

```bash
# Execute real transfers with real USDC
node demo-agent-authorization.js --live

# Will execute:
# 🔷 0.05 USDC → Ethereum
# 🔺 0.05 USDC → Avalanche  
# 🔴 0.05 USDC → Optimism
# 🔵 0.05 USDC → Arbitrum
# 🟦 0.05 USDC → Base
# 🟣 0.05 USDC → Polygon
# 🦄 0.05 USDC → Unichain
```

### **5. Verify Results**

Each transfer will show:
- ✅ **Transaction Hash**: Real blockchain transaction
- ✅ **Explorer Link**: View on blockchain explorer
- ✅ **Transfer Speed**: <500ms Gateway vs 30s CCTP
- ✅ **Balance Updates**: Real-time balance changes

---

## 🚨 **Prerequisites Checklist**

Before starting, ensure you have:

- [ ] **MetaMask installed** with your private key imported
- [ ] **1+ USDC** in your wallet for demo
- [ ] **0.05+ ETH** for gas fees
- [ ] **Circle API key** working (already configured ✅)
- [ ] **Gateway integration** built and tested (already done ✅)

---

## 💰 **Funding Shortcuts**

### **Fastest: Circle Dashboard**
1. Go to https://console.circle.com/wallets
2. Find your existing USDC balance
3. Transfer to MetaMask: `0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87`

### **Cheapest: Testnet**
1. Use Circle faucet for free testnet USDC
2. Demo works on 3 testnets (Sepolia, Base Sepolia, Avalanche Fuji)
3. Still shows Gateway advantages vs CCTP

### **Most Impressive: Mainnet**
1. Buy 1 USDC + some ETH for gas
2. Complete 7-chain demo with real money
3. Maximum impact for business demonstrations

---

## 🎯 **Expected Demo Results**

After completion, you'll have:

- ✅ **7 successful transfers** across all Gateway networks
- ✅ **Blockchain explorer links** for every transaction  
- ✅ **Speed demonstration** (<500ms vs 30s CCTP)
- ✅ **ZKP authorization proof** stored and verified
- ✅ **Production-ready system** proven with real money

**Total cost: ~$15 for a demo worth $thousands in proof-of-concept value**

---

## 🚀 **Ready to Start?**

1. **Choose funding method** (testnet free, mainnet $15)
2. **Run funding script**: `node fund-gateway-wallet.js`  
3. **Execute demo**: `node demo-agent-authorization.js --live`
4. **Watch magic happen**: Real ZKP + Gateway transfers across 7 chains!

**Questions? Issues? The scripts will guide you through each step with detailed error messages and solutions.**