const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Production x402 Payment Handler
 * 
 * This implements the proper x402 flow where:
 * 1. Client (payer) signs an EIP-3009 transferWithAuthorization
 * 2. Server (payee) executes the authorization on-chain
 * 
 * For demo purposes with testnet funds, we handle both:
 * - Server acting as payer (for demo)
 * - Client as payer (production flow)
 */

// Create a proper EIP-3009 authorization
async function createAuthorization({
  from,
  to,
  value,
  asset,
  chainId,
  validityWindow = 3600 // 1 hour default
}) {
  const validAfter = Math.floor(Date.now() / 1000);
  const validBefore = validAfter + validityWindow;
  const nonce = '0x' + crypto.randomBytes(32).toString('hex');
  
  return {
    from,
    to,
    value: BigInt(value).toString(),
    validAfter,
    validBefore,
    nonce
  };
}

// Sign an EIP-3009 authorization using EIP-712
async function signAuthorization({
  wallet,
  authorization,
  asset,
  chainId
}) {
  const domain = {
    name: 'USD Coin',  // USDC on Base Sepolia
    version: '2',
    chainId,
    verifyingContract: asset
  };
  
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
    ]
  };
  
  const signature = await wallet.signTypedData(domain, types, authorization);
  return signature;
}

// Execute a signed authorization on-chain
async function executeAuthorization({
  provider,
  executorWallet,
  asset,
  authorization,
  signature
}) {
  // Parse signature
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (sig.length !== 130) throw new Error('Invalid signature length');
  
  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  
  // EIP-3009 transferWithAuthorization ABI
  const abi = [
    'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external'
  ];
  
  const usdcContract = new ethers.Contract(asset, abi, executorWallet);
  
  const tx = await usdcContract.transferWithAuthorization(
    authorization.from,
    authorization.to,
    BigInt(authorization.value),
    BigInt(authorization.validAfter),
    BigInt(authorization.validBefore),
    authorization.nonce,
    v,
    r,
    s,
    { gasLimit: 150000 }
  );
  
  return tx;
}

// Create x402 payment header for server-side demo payment
async function createDemoPaymentHeader({
  privateKey,
  payTo,
  asset,
  amount,
  network,
  chainId
}) {
  const wallet = new ethers.Wallet(privateKey);
  
  // Create authorization where server wallet is the payer
  const authorization = await createAuthorization({
    from: wallet.address,
    to: payTo,
    value: amount,
    asset,
    chainId
  });
  
  // Sign the authorization
  const signature = await signAuthorization({
    wallet,
    authorization,
    asset,
    chainId
  });
  
  // Build x402 payment header
  const payload = {
    scheme: 'exact',
    network,
    payload: {
      authorization,
      signature
    }
  };
  
  // Base64url encode
  const headerStr = JSON.stringify(payload);
  const header = Buffer.from(headerStr).toString('base64url');
  
  return header;
}

// Verify and execute a payment from x402 header
async function processX402Payment({
  header,
  expectedAsset,
  expectedPayTo,
  expectedNetwork,
  privateKey,
  rpcUrl,
  chainId
}) {
  // Decode header
  const decoded = JSON.parse(Buffer.from(header, 'base64url').toString());
  
  // Validate
  if (decoded.scheme !== 'exact') throw new Error('Unsupported scheme');
  if (decoded.network !== expectedNetwork) throw new Error('Network mismatch');
  if (!decoded.payload?.authorization || !decoded.payload?.signature) {
    throw new Error('Missing authorization or signature');
  }
  
  const { authorization, signature } = decoded.payload;
  
  if (expectedPayTo && authorization.to.toLowerCase() !== expectedPayTo.toLowerCase()) {
    throw new Error('PayTo address mismatch');
  }
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId, name: expectedNetwork });
  const executorWallet = new ethers.Wallet(privateKey, provider);
  
  // Check if this is a demo payment from our own wallet
  if (authorization.from.toLowerCase() === executorWallet.address.toLowerCase()) {
    // Demo mode: Direct transfer since we're paying from our own wallet
    const abi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const usdc = new ethers.Contract(expectedAsset, abi, executorWallet);
    const tx = await usdc.transfer(authorization.to, BigInt(authorization.value), { gasLimit: 100000 });
    return { tx, mode: 'demo_transfer' };
  } else {
    // Production mode: Execute the signed authorization
    const tx = await executeAuthorization({
      provider,
      executorWallet,
      asset: expectedAsset,
      authorization,
      signature
    });
    return { tx, mode: 'production_authorization' };
  }
}

module.exports = {
  createAuthorization,
  signAuthorization,
  executeAuthorization,
  createDemoPaymentHeader,
  processX402Payment
};