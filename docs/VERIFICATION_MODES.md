# On-Chain Verification: View vs State-Changing Functions

## The Confusion: "Gasless" Verification

You correctly identified an important distinction! When we say "gasless verification," it can be misleading. Here's what's actually happening:

## Two Types of Smart Contract Interactions

### 1. View Functions (What We Initially Built)
```solidity
function verifyProof(...) external view returns (bool)
```

**Characteristics:**
- ✅ **FREE** - No gas cost
- ✅ Instant result
- ✅ No wallet/signing needed
- ❌ **No permanent record** on blockchain
- ❌ No events emitted
- ❌ No proof that verification happened
- ❌ Anyone can claim they verified

**Use Cases:**
- Quick checks during development
- Client-side validation
- When you just need to know if proof is valid
- Testing and debugging

### 2. State-Changing Functions (Real Verification)
```solidity
function verifyAndStore(...) external returns (bool)
```

**Characteristics:**
- ❌ **Costs gas** (~0.0005 ETH on Sepolia)
- ✅ **Permanent record** on blockchain
- ✅ Events emitted (queryable logs)
- ✅ Proof of verification exists forever
- ✅ Prevents double-spending of proofs
- ✅ Builds verifier reputation on-chain

**Use Cases:**
- Production systems
- Compliance requirements
- When you need proof of verification
- Audit trails

## The Trade-off

| Aspect | View Function | State-Changing |
|--------|--------------|----------------|
| **Cost** | FREE | ~$1-2 on mainnet |
| **Speed** | Instant | 12-30 seconds |
| **Permanent** | No | Yes |
| **Proof** | No | Transaction hash |
| **Events** | No | Yes |
| **Trust** | Self-reported | Cryptographic |

## Why Both Exist

1. **View Functions** are perfect for:
   - The verifier contract checking if a proof is mathematically valid
   - Quick client-side checks
   - Development and testing

2. **State-Changing Functions** are necessary when:
   - You need to prove verification happened
   - Building reputation systems
   - Regulatory compliance
   - Preventing replay attacks

## Our Implementation

We now have both:

### Simple Verifier (View Only)
- Address: `0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308`
- Just checks if proof is valid
- No state changes

### Storage Verifier (State-Changing)
- Address: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944`
- Stores verification results
- Emits events
- Costs gas but provides permanent proof

## Usage Example

```javascript
// FREE - Just checking validity
const response = await fetch('/groth16/workflow', {
    method: 'POST',
    body: JSON.stringify({
        decision: 1,
        confidence: 95,
        permanent: false  // View mode
    })
});

// COSTS GAS - Creating permanent record
const response = await fetch('/groth16/workflow', {
    method: 'POST', 
    body: JSON.stringify({
        decision: 1,
        confidence: 95,
        permanent: true  // State-changing mode
    })
});
```

## The Bottom Line

**You were right to question this!** True blockchain verification requires a state-changing transaction that costs gas. View functions are useful tools but don't provide the immutability and auditability that blockchain is known for.

For a production system handling real money (like Circle Gateway), you'd want the permanent version to have indisputable proof that verification occurred.