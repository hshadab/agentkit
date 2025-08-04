// Test medical workflow - proof generation only, no blockchain verification
import fs from 'fs';
import { spawn } from 'child_process';

async function testMedicalProofOnly() {
    console.log('🏥 Testing medical proof generation (no blockchain verification)...\n');
    
    // Create workflow with just proof generation
    const workflow = {
        "description": "Generate medical integrity proof only",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "medical_integrity",
                "patient_id": "12345",
                "record_hash": "0xabc123def456789",
                "description": "Generate medical integrity proof",
                "index": 0
            }
        ],
        "workflow_id": "wf_medical_proof_only_" + Date.now()
    };
    
    // Save workflow
    const filename = `/home/hshadab/agentkit/temp_workflows/parsed_workflow_${workflow.workflow_id}.json`;
    
    try {
        fs.mkdirSync('/home/hshadab/agentkit/temp_workflows', { recursive: true });
    } catch (e) {}
    
    fs.writeFileSync(filename, JSON.stringify(workflow, null, 2));
    console.log('✅ Saved workflow to:', filename);
    
    // Execute workflow
    console.log('🚀 Executing workflow...\n');
    
    const child = spawn('node', [
        '/home/hshadab/agentkit/parsers/workflow/workflowCLI.js',
        '--parsed-file',
        filename
    ], {
        cwd: '/home/hshadab/agentkit'
    });
    
    let outputBuffer = '';
    let success = false;
    
    child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        outputBuffer += output + '\n';
        console.log(`[WORKFLOW] ${output}`);
        
        // Check for success indicators
        if (output.includes('proof_medical_integrity_')) {
            const match = output.match(/proof_medical_integrity_\d+/);
            if (match) {
                console.log('\n✅ Medical integrity proof generated:', match[0]);
                success = true;
            }
        }
    });
    
    child.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (!error.includes('Medical record creation timed out')) {
            console.error(`[ERROR] ${error}`);
        }
    });
    
    child.on('close', (code) => {
        console.log(`\n✅ Workflow exited with code ${code}`);
        
        if (success) {
            console.log('\n🎉 SUCCESS: Medical integrity proof was generated successfully!');
            console.log('💡 The proof can be verified on Avalanche using the UI when a browser is connected.');
        } else {
            console.log('\n❌ FAILED: No proof was generated');
        }
        
        // Clean up
        try {
            fs.unlinkSync(filename);
        } catch (e) {}
        
        process.exit(code);
    });
    
    // Timeout
    setTimeout(() => {
        console.log('\n⏰ Test timeout');
        child.kill();
        process.exit(1);
    }, 60000);
}

// Run the test
testMedicalProofOnly().catch(console.error);