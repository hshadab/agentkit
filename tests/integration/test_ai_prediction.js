// Test AI prediction proof generation
import fs from 'fs';
import { spawn } from 'child_process';

async function testAIPrediction() {
    console.log('🤖 Testing AI prediction proof generation...\n');
    
    // Create workflow with AI prediction proof
    const workflow = {
        "description": "Generate AI prediction proof",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "ai_content",
                "description": "Generate AI prediction commitment proof",
                "index": 0
            }
        ],
        "workflow_id": "wf_ai_test_" + Date.now()
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
        
        // Check for proof ID
        const proofMatch = outputBuffer.match(/proof_ai_content_\d+/);
        if (proofMatch) {
            console.log('\n🎉 SUCCESS: AI prediction proof generated:', proofMatch[0]);
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
testAIPrediction().catch(console.error);