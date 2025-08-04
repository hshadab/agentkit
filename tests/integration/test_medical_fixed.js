// Test medical proof with the fix applied
import fs from 'fs';
import { spawn } from 'child_process';

async function testMedicalFixed() {
    console.log('🏥 Testing medical integrity proof (fixed version)...\n');
    
    // Create workflow with medical proof
    const workflow = {
        "description": "Generate medical integrity proof",
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
        "workflow_id": "wf_medical_fixed_" + Date.now()
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
    let startTime = Date.now();
    
    child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        outputBuffer += output + '\n';
        console.log(`[WORKFLOW] ${output}`);
    });
    
    child.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (!error.includes('Trace:')) {
            console.error(`[ERROR] ${error}`);
        }
    });
    
    child.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Workflow exited with code ${code} after ${duration}s`);
        
        // Check for proof ID
        const proofMatch = outputBuffer.match(/proof_medical_integrity_\d+/);
        if (proofMatch) {
            console.log('\n🎉 SUCCESS: Medical integrity proof generated:', proofMatch[0]);
            console.log('✅ No more waiting for medical record creation!');
            console.log('✅ Works just like AI prediction proof now!');
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
testMedicalFixed().catch(console.error);