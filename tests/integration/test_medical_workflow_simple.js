// Test simplified medical workflow - proof generation only
import fs from 'fs';
import { spawn } from 'child_process';

async function testSimplifiedMedicalWorkflow() {
    console.log('🏥 Testing simplified medical workflow (proof only)...\n');
    
    // Create a simplified workflow with just proof generation
    const simplifiedWorkflow = {
        "description": "Generate medical integrity proof without blockchain",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "medical_integrity", 
                "patient_id": "12345",
                "record_hash": "123456789",
                "creation_timestamp": String(Math.floor(Date.now() / 1000) - 86400),
                "verification_timestamp": String(Math.floor(Date.now() / 1000)),
                "description": "Generate medical integrity proof",
                "index": 0
            }
        ],
        "workflow_id": "wf_medical_simple_" + Date.now()
    };
    
    // Save workflow
    const filename = `/home/hshadab/agentkit/temp_workflows/parsed_workflow_${simplifiedWorkflow.workflow_id}.json`;
    
    // Ensure directory exists
    try {
        fs.mkdirSync('/home/hshadab/agentkit/temp_workflows', { recursive: true });
    } catch (e) {
        // Directory might already exist
    }
    
    fs.writeFileSync(filename, JSON.stringify(simplifiedWorkflow, null, 2));
    console.log('✅ Saved simplified workflow to:', filename);
    console.log('📋 Workflow steps:', JSON.stringify(simplifiedWorkflow.steps, null, 2));
    
    // Execute workflow
    console.log('\n🚀 Executing simplified workflow...\n');
    
    const child = spawn('node', [
        '/home/hshadab/agentkit/parsers/workflow/workflowCLI.js',
        '--parsed-file',
        filename
    ], {
        cwd: '/home/hshadab/agentkit'
    });
    
    let outputBuffer = '';
    
    child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        outputBuffer += output + '\n';
        console.log(`[WORKFLOW] ${output}`);
    });
    
    child.stderr.on('data', (data) => {
        console.error(`[ERROR] ${data.toString().trim()}`);
    });
    
    child.on('close', (code) => {
        console.log(`\n✅ Workflow exited with code ${code}`);
        
        // Check if proof was generated
        if (outputBuffer.includes('proof_medical_integrity_')) {
            console.log('\n🎉 SUCCESS: Medical integrity proof was generated!');
            
            // Extract proof ID
            const proofIdMatch = outputBuffer.match(/proof_medical_integrity_\d+/);
            if (proofIdMatch) {
                console.log('📝 Proof ID:', proofIdMatch[0]);
            }
        } else {
            console.log('\n❌ FAILED: No proof ID found in output');
        }
        
        // Clean up
        try {
            fs.unlinkSync(filename);
        } catch (e) {
            // File might already be deleted
        }
        
        process.exit(code);
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
        console.log('\n⏰ Test timeout after 60 seconds');
        child.kill();
        process.exit(1);
    }, 60000);
}

// Run the test
testSimplifiedMedicalWorkflow().catch(console.error);