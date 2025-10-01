#!/usr/bin/env node

// Test the full UI workflow: proof generation → verification
// This simulates exactly what the browser UI does

async function testWorkflow() {
    console.log('🧪 Testing Full UI Workflow\n');

    // Step 1: Generate proof (simulating Step 3 in UI)
    console.log('Step 1: Calling proof service (port 9001)...');
    const proofResponse = await fetch('http://localhost:9001/prove-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_rules: {
                daily_limit: 1000,
                per_transaction_max: 500,
                allowed_categories: ['groceries'],
                trusted_merchants: { demo_merchant: 0.5 },
                spent_today: 0,
                transactions_today: 0
            },
            transaction: {
                merchant_id: 'demo_merchant',
                amount: 2.5,
                category: 'groceries'
            }
        })
    });

    const authProof = await proofResponse.json();
    console.log('✅ Proof response:', {
        success: authProof.success,
        decision: authProof.decision,
        confidence: authProof.confidence,
        has_proof: !!authProof.proof,
        has_publicSignals: !!authProof.publicSignals,
        proof_keys: authProof.proof ? Object.keys(authProof.proof) : []
    });

    if (!authProof.success || !authProof.proof) {
        console.error('❌ Proof generation failed');
        process.exit(1);
    }

    // Step 2: Verify proof on-chain (simulating Step 4 in UI)
    console.log('\nStep 2: Calling verification service (port 9004)...');
    console.log('Sending:', {
        has_proof: !!authProof.proof,
        proof_structure: {
            pi_a: authProof.proof.pi_a ? 'present' : 'missing',
            pi_b: authProof.proof.pi_b ? 'present' : 'missing',
            pi_c: authProof.proof.pi_c ? 'present' : 'missing'
        },
        publicSignals: authProof.publicSignals
    });

    const verifyResponse = await fetch('http://localhost:9004/verify-onchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            proof: authProof.proof,
            publicSignals: authProof.publicSignals
        })
    });

    const verifyData = await verifyResponse.json();
    console.log('✅ Verification response:', verifyData);

    if (verifyData.valid || verifyData.verified) {
        console.log('\n🎉 SUCCESS! Full workflow working:');
        console.log('  ✅ Proof generation: WORKING');
        console.log('  ✅ On-chain verification: WORKING');
        console.log('  ✅ Decision:', authProof.decision ? 'AUTHORIZED' : 'DENIED');
        console.log('  ✅ Confidence:', Math.round(authProof.confidence * 100) + '%');
        console.log('  ✅ Verifier:', verifyData.verifier_address);
        console.log('\n💡 Now refresh the browser with Ctrl+Shift+R (hard refresh)');
        console.log('   Or use: Cmd+Shift+Delete → Empty Cache → Hard Reload');
        process.exit(0);
    } else {
        console.error('\n❌ FAILED: Verification returned false');
        console.error('Response:', verifyData);
        process.exit(1);
    }
}

testWorkflow().catch(err => {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
});
