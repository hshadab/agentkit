// Test medical workflow in headless mode (no browser required)
import fs from 'fs';
import { spawn } from 'child_process';
import WebSocket from 'ws';

async function testMedicalWorkflowHeadless() {
    console.log('🏥 Testing medical workflow in headless mode...\n');
    
    // Create workflow with correct step types (medical record creation is handled in generate_proof)
    const workflow = {
        "description": "Generate medical integrity proof and verify on Avalanche",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "medical_integrity",
                "patient_id": "12345",
                "record_hash": "0xabc123def456789",
                "description": "Generate medical integrity proof",
                "index": 0
            },
            {
                "type": "verify_on_avalanche",
                "proof_type": "medical_integrity", 
                "record_id": "0xabc123def456789",
                "description": "Verify medical integrity on Avalanche",
                "index": 1
            }
        ],
        "workflow_id": "wf_medical_headless_" + Date.now()
    };
    
    // Save workflow
    const filename = `/home/hshadab/agentkit/temp_workflows/parsed_workflow_${workflow.workflow_id}.json`;
    
    try {
        fs.mkdirSync('/home/hshadab/agentkit/temp_workflows', { recursive: true });
    } catch (e) {}
    
    fs.writeFileSync(filename, JSON.stringify(workflow, null, 2));
    console.log('✅ Saved workflow to:', filename);
    
    // Connect to WebSocket to simulate browser responses
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ Connected to WebSocket server as headless responder\n');
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            // Handle medical record creation request
            if (message.type === 'create_medical_record_with_commitment') {
                console.log('📥 Received medical record request, sending simulated response...');
                
                // Simulate successful medical record creation
                ws.send(JSON.stringify({
                    type: 'medical_record_complete',
                    requestId: message.requestId,
                    success: true,
                    recordData: {
                        record_id: `medical_${message.patientId}_${Date.now()}`,
                        patient_id: message.patientId,
                        record_hash: message.recordHash,
                        creation_timestamp: Math.floor(Date.now() / 1000),
                        commitment_timestamp: Math.floor(Date.now() / 1000),
                        transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
                        blockNumber: Math.floor(Math.random() * 1000000),
                        status: 'committed_simulated',
                        avalanche_record_id: 1
                    }
                }));
                console.log('✅ Sent medical record response');
            }
            
            // Handle Avalanche verification request
            if (message.type === 'verify_on_avalanche') {
                console.log('📥 Received Avalanche verification request, sending simulated response...');
                
                // Simulate successful verification
                ws.send(JSON.stringify({
                    type: 'verification_result',
                    requestId: message.requestId,
                    result: 'VALID',
                    transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
                    success: true
                }));
                console.log('✅ Sent verification response');
            }
            
        } catch (error) {
            // Ignore parsing errors for non-JSON messages
        }
    });
    
    // Small delay to ensure WebSocket is connected
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
        
        // Check results
        if (outputBuffer.includes('proof_medical_integrity_')) {
            console.log('\n🎉 SUCCESS: Medical integrity proof was generated!');
            
            const proofIdMatch = outputBuffer.match(/proof_medical_integrity_\d+/);
            if (proofIdMatch) {
                console.log('📝 Proof ID:', proofIdMatch[0]);
            }
        }
        
        if (outputBuffer.includes('Workflow execution completed successfully')) {
            console.log('✅ Full workflow completed successfully!');
        }
        
        // Clean up
        ws.close();
        try {
            fs.unlinkSync(filename);
        } catch (e) {}
        
        process.exit(code);
    });
    
    // Timeout
    setTimeout(() => {
        console.log('\n⏰ Test timeout');
        child.kill();
        ws.close();
        process.exit(1);
    }, 180000); // 3 minutes
}

// Run the test
testMedicalWorkflowHeadless().catch(console.error);