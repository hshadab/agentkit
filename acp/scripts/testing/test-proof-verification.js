#!/usr/bin/env node

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const WASM = path.join(__dirname, 'circuits/build/AgentAuthorizationSimple_js/AgentAuthorizationSimple.wasm');
const ZKEY = path.join(__dirname, 'circuits/build/AgentAuthorizationSimple_final.zkey');
const VKEY_PATH = path.join(__dirname, 'circuits/build/verification_key.json');

async function testProofGeneration() {
  console.log('\n🧪 Testing Proof Generation and Verification\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Generate verification key from zkey if not exists
    console.log('\n1️⃣ Exporting verification key from zkey...');
    const vKey = await snarkjs.zKey.exportVerificationKey(ZKEY);
    fs.writeFileSync(VKEY_PATH, JSON.stringify(vKey, null, 2));
    console.log('✅ Verification key exported');

    // Step 2: Generate proof with same inputs as failing transaction
    console.log('\n2️⃣ Generating proof with test inputs...');
    const input = {
      authorized: 1,
      proofHash: '1518518636',
      budgetRemaining: 500,
      amount: 2,
      timestamp: 1759310144
    };
    console.log('   Input:', JSON.stringify(input, null, 2));

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
    console.log('✅ Proof generated successfully');
    console.log('   Public signals:', publicSignals);

    // Step 3: Verify proof locally with snarkjs
    console.log('\n3️⃣ Verifying proof locally with snarkjs...');
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    if (verified) {
      console.log('✅ LOCAL VERIFICATION PASSED');
    } else {
      console.log('❌ LOCAL VERIFICATION FAILED');
      return;
    }

    // Step 4: Show proof structure
    console.log('\n4️⃣ Proof structure:');
    console.log('   pi_a:', proof.pi_a);
    console.log('   pi_b:', proof.pi_b);
    console.log('   pi_c:', proof.pi_c);

    // Step 5: Format for contract (as done in onchain-verification-service)
    console.log('\n5️⃣ Formatting proof for contract...');
    const contractProof = {
      pA: proof.pi_a.slice(0, 2),
      pB: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Reversed
        [proof.pi_b[1][1], proof.pi_b[1][0]]
      ],
      pC: proof.pi_c.slice(0, 2),
      pubSignals: publicSignals.map(s => s.toString())
    };
    console.log('   pA:', contractProof.pA);
    console.log('   pB:', contractProof.pB);
    console.log('   pC:', contractProof.pC);
    console.log('   pubSignals:', contractProof.pubSignals);

    // Step 6: Test contract verification
    console.log('\n6️⃣ Testing on-chain verification...');
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const VERIFIER_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

    const verifierABI = [
      'function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[2] memory input) public view returns (bool)'
    ];

    const contract = new ethers.Contract(VERIFIER_ADDRESS, verifierABI, provider);

    try {
      const result = await contract.verifyProof(
        contractProof.pA,
        contractProof.pB,
        contractProof.pC,
        contractProof.pubSignals
      );

      if (result) {
        console.log('✅ ON-CHAIN VERIFICATION PASSED');
      } else {
        console.log('❌ ON-CHAIN VERIFICATION RETURNED FALSE');
      }
    } catch (error) {
      console.log('❌ ON-CHAIN VERIFICATION FAILED');
      console.log('   Error:', error.message);

      // Try with alternative proof formatting
      console.log('\n7️⃣ Trying alternative proof format (no reversal)...');
      const altProof = {
        pA: proof.pi_a.slice(0, 2),
        pB: proof.pi_b.map(coord => coord.slice(0, 2)),
        pC: proof.pi_c.slice(0, 2),
        pubSignals: publicSignals.map(s => s.toString())
      };

      try {
        const altResult = await contract.verifyProof(
          altProof.pA,
          altProof.pB,
          altProof.pC,
          altProof.pubSignals
        );

        if (altResult) {
          console.log('✅ ON-CHAIN VERIFICATION PASSED (with alternative format)');
          console.log('⚠️  Need to update formatProofForContract() to NOT reverse pi_b');
        } else {
          console.log('❌ ON-CHAIN VERIFICATION STILL FAILED (alternative format)');
        }
      } catch (altError) {
        console.log('❌ Alternative format also failed:', altError.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testProofGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
