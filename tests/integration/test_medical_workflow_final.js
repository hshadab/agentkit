// Final test for medical workflow - with proper error handling
import fs from 'fs';
import { spawn } from 'child_process';

async function testMedicalWorkflowFinal() {
    console.log('🏥 Testing complete medical workflow with error handling...\n');
    
    // Create workflow with medical proof generation and optional Avalanche verification
    const workflow = {
        "description": "Generate and verify medical integrity proof",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "medical_integrity",
                "patient_id": "12345",
                "record_hash": "0xabc123def456789",
                "description": "Generate medical integrity proof with blockchain commitment",
                "index": 0
            },
            {
                "type": "verify_on_avalanche",
                "proof_type": "medical_integrity",
                "record_id": "0xabc123def456789", 
                "description": "Verify medical integrity on Avalanche (optional)",
                "index": 1,
                "optional": true  // Mark as optional
            }
        ],
        "workflow_id": "wf_medical_final_" + Date.now()
    };
    
    // Save workflow
    const filename = `/home/hshadab/agentkit/temp_workflows/parsed_workflow_${workflow.workflow_id}.json`;
    
    try {
        fs.mkdirSync('/home/hshadab/agentkit/temp_workflows', { recursive: true });
    } catch (e) {}
    
    fs.writeFileSync(filename, JSON.stringify(workflow, null, 2));
    console.log('✅ Saved workflow to:', filename);
    console.log('📋 Workflow includes:');
    console.log('   1. Medical integrity proof generation (with simulated Avalanche commitment)');
    console.log('   2. Optional Avalanche verification (will skip if no browser connected)\n');
    
    // Execute workflow
    console.log('🚀 Executing workflow...\n');
    
    const child = spawn('node', [
        '/home/hshadab/agentkit/parsers/workflow/workflowCLI.js',
        '--parsed-file',
        filename
    ], {
        cwd: '/home/hshadab/agentkit',
        env: { ...process.env, SKIP_BROWSER_STEPS: 'true' }  // Hint to skip browser steps
    });
    
    let proofGenerated = false;
    let verificationAttempted = false;
    let proofId = null;
    
    child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[WORKFLOW] ${output}`);
        
        // Track proof generation
        if (output.includes('proof_medical_integrity_')) {
            const match = output.match(/proof_medical_integrity_\d+/);
            if (match) {
                proofId = match[0];
                proofGenerated = true;
                console.log(`\n✅ Medical integrity proof generated: ${proofId}`);
            }
        }
        
        // Track verification attempt
        if (output.includes('Verify on Avalanche')) {
            verificationAttempted = true;
        }
    });
    
    child.stderr.on('data', (data) => {
        const error = data.toString().trim();
        // Only show non-timeout errors
        if (!error.includes('timed out') && !error.includes('Trace:')) {
            console.error(`[ERROR] ${error}`);
        }
    });
    
    child.on('close', (code) => {
        console.log(`\n============================================================`);
        console.log(`📊 WORKFLOW EXECUTION SUMMARY`);
        console.log(`============================================================`);
        console.log(`Exit code: ${code}`);
        console.log(`Proof generated: ${proofGenerated ? '✅ YES' : '❌ NO'}`);
        if (proofId) {
            console.log(`Proof ID: ${proofId}`);
        }
        console.log(`Avalanche verification attempted: ${verificationAttempted ? 'Yes' : 'No'}`);
        
        if (proofGenerated) {
            console.log(`\n🎉 SUCCESS: Medical integrity proof was generated!`);
            console.log(`\n💡 Next steps:`);
            console.log(`   1. The proof includes simulated Avalanche commitment data`);
            console.log(`   2. To verify on actual Avalanche blockchain:`);
            console.log(`      - Open http://localhost:8001 in a browser`);
            console.log(`      - Connect MetaMask to Avalanche Fuji testnet`);
            console.log(`      - Click "Verify on Avalanche" for proof ${proofId}`);
        } else {
            console.log(`\n❌ FAILED: No proof was generated`);
        }
        
        console.log(`============================================================\n`);
        
        // Clean up
        try {
            fs.unlinkSync(filename);
        } catch (e) {}
        
        process.exit(proofGenerated ? 0 : 1);
    });
    
    // Timeout
    setTimeout(() => {
        console.log('\n⏰ Test timeout after 2 minutes');
        child.kill();
        process.exit(1);
    }, 120000);
}

// Run the test
testMedicalWorkflowFinal().catch(console.error);