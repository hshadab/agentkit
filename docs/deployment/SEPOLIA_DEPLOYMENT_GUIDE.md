# Sepolia Deployment Guide for KYC Proof Verification

This guide contains all the information needed to deploy and verify the KYC proof on Sepolia testnet.

## ✅ Current Status

1. **KYC Proof Generated**: Successfully created a real SNARK proof for KYC verification
2. **Local Verification**: Proof verified successfully on local Hardhat network
3. **Contract Ready**: `RealProofOfProofVerifier.sol` generated and tested
4. **Gas Estimate**: ~249,305 gas (≈ 0.00499 ETH at 20 gwei)

## 📋 Proof Details

- **Commitment**: `17642062985293407986215170688001621156485767732106975739066346399609420560556`
- **Proof Type**: 1 (KYC)
- **Timestamp**: 2025-07-13T02:48:15.000Z
- **Verification Result**: ✅ VALID

## 🚀 Deployment Steps

### 1. Get Sepolia ETH
Visit: https://sepolia-faucet.pk910.de/
- Enter your wallet address
- Complete the PoW challenge
- Receive 0.05 ETH (more than enough)

### 2. Set Environment Variables
Add to `.env` file:
```bash
DEPLOYER_PRIVATE_KEY=0x... # Your wallet's private key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com # Optional, default provided
```

### 3. Deploy the Contract
```bash
npx hardhat run scripts/deploy_real_verifier.js --network sepolia
```

This will:
- Deploy `RealProofOfProofVerifier.sol`
- Automatically verify the KYC proof
- Save deployment info to `deployment-sepolia.json`

### 4. Manual Verification on Etherscan

If you want to verify manually after deployment:

1. Go to: `https://sepolia.etherscan.io/address/[CONTRACT_ADDRESS]#writeContract`
2. Connect your wallet
3. Find the `verifyProof` function
4. Enter these parameters:

```json
_pA: ["17448579428011680308843565398968585386338465642628901714908512659427823242397", "13650413943004925241432946151465185838695541366283428340888641728277396491413"]

_pB: [["21638710014099597228828375264333906042608019447072778042682042385684392956645", "1024164701991340613864351052357037294563510577795321535517202421837327851832"], ["14311686171086127149236666556358886163339863787019571783966338305083512269506", "1762479965446622238623676238599453372231909969065734077936807312378883261889"]]

_pC: ["8287574375266737032437902556454277226334895028266128163995120590069293210409", "13359884323677653720258485353626265909143739068256413812282679322864708728995"]

_pubSignals: ["17642062985293407986215170688001621156485767732106975739066346399609420560556", "1", "19111197786344874140976041921207670147795837494645083100567812880793765699104", "1", "1752374895", "393497521552106548350714323930204177612837651565002120965772774848898627216"]
```

## 📊 Expected Results

- **verifyProof** will return: `true`
- Transaction will emit events confirming verification
- Gas used: ~249,305 (actual may vary slightly)

## 🔍 Verification Parameters

The full verification parameters are saved in `verification_params.json`:
- Contains all proof data in the correct format
- Includes the calldata for manual transaction creation
- Can be used for debugging or alternative verification methods

## 🏷️ Contract Interface

```solidity
function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[6] calldata _pubSignals
) public view returns (bool)
```

## ⚠️ Important Notes

1. **Private Key Security**: Never commit your private key to git
2. **Test First**: The proof has been verified locally, so it will work on Sepolia
3. **Gas Price**: Current config uses 20 gwei, adjust if needed
4. **Faucet Limits**: Most faucets give 0.05-0.1 ETH per day

## 🎯 Success Criteria

The deployment is successful when:
1. Contract is deployed to Sepolia
2. `verifyProof` returns `true` for the KYC proof
3. Transaction is confirmed on Etherscan
4. Deployment info is saved locally

## Alternative: Using Remix

If you prefer using Remix:
1. Copy `contracts/RealProofOfProofVerifier.sol` to Remix
2. Compile with Solidity 0.8.19
3. Deploy to Injected Provider - MetaMask (Sepolia)
4. Use the verification parameters above

---

Generated: 2025-07-13
Proof ID: kyc_test_1752374837774
EOF < /dev/null
