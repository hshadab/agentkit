#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

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
    
    // Create test directory
    const testDir = './test_medical_proof_' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    
    // Execute zkEngine command
    const wasmPath = './zkengine_binary/medical_integrity.wasm';
    const zkEnginePath = './zkengine_binary/zkEngine';
    
    const cmd = `${zkEnginePath} prove --wasm ${wasmPath} --out-dir ${testDir} --step 16 ${patientId} ${recordHash} ${creationTime} ${verificationTime}`;
    
    console.log('\n🚀 Executing command:');
    console.log(cmd);
    
    try {
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(cmd);
        const duration = Date.now() - startTime;
        
        console.log('\n✅ Proof generated successfully!');
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (stdout) {
            console.log('\n📄 stdout:');
            console.log(stdout);
        }
        
        if (stderr) {
            console.log('\n⚠️  stderr:');
            console.log(stderr);
        }
        
        // Check generated files
        console.log('\n📁 Generated files:');
        const files = fs.readdirSync(testDir);
        files.forEach(file => {
            const stats = fs.statSync(path.join(testDir, file));
            console.log(`   - ${file} (${stats.size} bytes)`);
        });
        
        // Read public inputs
        const publicPath = path.join(testDir, 'public.json');
        if (fs.existsSync(publicPath)) {
            const publicInputs = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
            console.log('\n🔍 Public inputs:', publicInputs);
        }
        
    } catch (error) {
        console.error('\n❌ Error generating proof:');
        console.error(error.message);
        if (error.stdout) console.log('\nstdout:', error.stdout);
        if (error.stderr) console.log('\nstderr:', error.stderr);
    }
    
    // Clean up
    try {
        fs.rmSync(testDir, { recursive: true });
        console.log('\n🧹 Cleaned up test directory');
    } catch (e) {
        console.log('\n⚠️  Could not clean up test directory:', e.message);
    }
}

// Compare with AI prediction proof
async function testAIProof() {
    console.log('\n\n🤖 Testing AI Prediction Proof for comparison...\n');
    
    const contentHash = '12345';
    const providerSignature = '1347440205'; // OpenAI signature
    const apiKeyHash = '999';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const contentLength = '100';
    
    console.log('📋 Test Parameters:');
    console.log(`   Content Hash: ${contentHash}`);
    console.log(`   Provider Signature: ${providerSignature}`);
    console.log(`   API Key Hash: ${apiKeyHash}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Content Length: ${contentLength}`);
    
    const testDir = './test_ai_proof_' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    
    const wasmPath = './zkengine_binary/ai_prediction_commitment.wasm';
    const zkEnginePath = './zkengine_binary/zkEngine';
    
    const cmd = `${zkEnginePath} prove --wasm ${wasmPath} --out-dir ${testDir} --step 16 ${contentHash} ${providerSignature} ${apiKeyHash} ${timestamp} ${contentLength}`;
    
    console.log('\n🚀 Executing command:');
    console.log(cmd);
    
    try {
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(cmd);
        const duration = Date.now() - startTime;
        
        console.log('\n✅ AI Proof generated successfully!');
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (stdout) console.log('\n📄 stdout:', stdout);
        if (stderr) console.log('\n⚠️  stderr:', stderr);
        
    } catch (error) {
        console.error('\n❌ Error generating AI proof:');
        console.error(error.message);
    }
    
    // Clean up
    try {
        fs.rmSync(testDir, { recursive: true });
    } catch (e) {}
}

// Run both tests
testMedicalProof().then(() => testAIProof());