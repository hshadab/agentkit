import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function testMedicalProof() {
    console.log('🧪 Testing Medical Integrity Proof Generation...\n');
    
    // Test data
    const patientId = "12345";
    const recordHash = "123456789"; // Simple hash for testing
    const creationTime = String(Math.floor(Date.now() / 1000) - 86400); // 1 day ago
    const verificationTime = String(Math.floor(Date.now() / 1000));
    
    console.log('📋 Test Parameters:');
    console.log(`   Patient ID: ${patientId}`);
    console.log(`   Record Hash: ${recordHash}`);
    console.log(`   Creation Time: ${creationTime}`);
    console.log(`   Verification Time: ${verificationTime}`);
    
    const zkEnginePath = process.env.ZKENGINE_BINARY || '/home/hshadab/agentic/zkEngine_dev/wasm_file';
    const wasmPath = '/home/hshadab/agentkit/zkengine_binary/medical_integrity.wasm';
    
    // Construct zkEngine command
    const cmd = `${zkEnginePath} ${patientId} ${recordHash} ${creationTime} ${verificationTime} ${wasmPath}`;
    
    console.log('\n🚀 Running zkEngine...');
    console.log(`Command: ${cmd}`);
    
    try {
        const { stdout, stderr } = await execAsync(cmd);
        
        if (stderr) {
            console.log('\n⚠️ zkEngine stderr:', stderr);
        }
        
        console.log('\n✅ zkEngine output:');
        console.log(stdout);
        
        // Try to parse the output
        const lines = stdout.trim().split('\n');
        const proofLine = lines.find(line => line.startsWith('Proof:'));
        
        if (proofLine) {
            const proofData = proofLine.substring(6).trim();
            console.log('\n🔐 Generated Proof:', proofData.substring(0, 50) + '...');
            
            // Check if it's valid JSON
            try {
                const proofObj = JSON.parse(proofData);
                console.log('✅ Proof is valid JSON');
                console.log('   Type:', proofObj.proof_type || 'Unknown');
            } catch (e) {
                console.log('⚠️ Proof is not JSON format');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stdout) console.log('stdout:', error.stdout);
        if (error.stderr) console.log('stderr:', error.stderr);
    }
}

testMedicalProof();