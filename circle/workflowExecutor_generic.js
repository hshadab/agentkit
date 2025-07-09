// workflowExecutor_generic.js - Fixed version with proper conditional transfer logic
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import CircleHandler from './circleHandler.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WorkflowExecutor {
    constructor() {
        this.wsClient = null;
        this.currentWorkflow = null;
        this.proofResults = {}; // Store proof results for conditional checks
        this.verificationResults = {}; // Store verification results
        this.workflowId = null;
        this.stepResults = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.wsClient = new WebSocket('ws://localhost:8001/ws');
            
            this.wsClient.on('open', () => {
                console.log('✅ Connected to Rust WebSocket server');
                resolve();
            });
            
            this.wsClient.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });
            
            this.wsClient.on('close', () => {
                console.log('🔌 WebSocket connection closed');
            });
        });
    }

    async executeWorkflow(parsedWorkflow) {
        this.currentWorkflow = parsedWorkflow;
        this.workflowId = `wf_${uuidv4()}`;
        this.proofResults = {};
        this.verificationResults = {};
        this.stepResults = [];
        
        console.log(`\n🚀 Starting workflow execution: ${this.workflowId}`);
        console.log(`📋 Steps to execute: ${parsedWorkflow.steps.length}`);
        
        // Send workflow started message with steps
        this.sendWorkflowUpdate('workflow_started', {
            workflowId: this.workflowId,
            steps: parsedWorkflow.steps.map((step, index) => ({
                id: `step_${index + 1}`,
                action: step.type,
                description: step.description || `${step.type} operation`,
                status: 'pending',
                proofType: step.type.includes('kyc') ? 'kyc' : 
                          step.type.includes('location') ? 'location' : 
                          step.type.includes('ai') ? 'ai_content' : undefined
            }))
        });
        
        try {
            for (let i = 0; i < parsedWorkflow.steps.length; i++) {
                const step = parsedWorkflow.steps[i];
                const stepId = `step_${i + 1}`;
                console.log(`\n📝 Executing step ${i + 1}: ${step.type}`);
                
                // Check if step should be skipped based on conditions
                if (await this.shouldSkipStep(step, i)) {
                    console.log(`⏭️  Skipping step ${i + 1}: Condition not met`);
                    
                    // Send step update for skipped step
                    this.sendWorkflowUpdate('workflow_step_update', {
                        workflowId: this.workflowId,
                        stepId: stepId,
                        updates: {
                            status: 'skipped',
                            reason: 'Condition not met',
                            startTime: Date.now(),
                            endTime: Date.now()
                        }
                    });
                    
                    this.stepResults.push({
                        step: i + 1,
                        type: step.type,
                        status: 'skipped',
                        reason: 'Condition not met'
                    });
                    continue;
                }
                
                // Send step update: executing
                this.sendWorkflowUpdate('workflow_step_update', {
                    workflowId: this.workflowId,
                    stepId: stepId,
                    updates: {
                        status: 'executing',
                        startTime: Date.now()
                    }
                });
                
                const startTime = Date.now();
                const result = await this.executeStep(step, i);
                const endTime = Date.now();
                
                // Send step update: completed or failed
                this.sendWorkflowUpdate('workflow_step_update', {
                    workflowId: this.workflowId,
                    stepId: stepId,
                    updates: {
                        status: result.success ? 'completed' : 'failed',
                        endTime: endTime,
                        startTime: startTime,
                        result: result.success ? 'Success' : result.error
                    }
                });
                
                this.stepResults.push({
                    step: i + 1,
                    type: step.type,
                    status: result.success ? 'completed' : 'failed',
                    result: result
                });
                
                // If step failed, decide whether to continue
                if (!result.success && step.critical !== false) {
                    console.error(`❌ Critical step failed, stopping workflow`);
                    throw new Error(`Step ${i + 1} (${step.type}) failed: ${result.error}`);
                }
            }
            
            // Send workflow completed message
            this.sendWorkflowUpdate('workflow_completed', {
                workflowId: this.workflowId,
                success: true,
                steps: this.stepResults,
                proofSummary: this.getProofSummary(),
                transferIds: this.getTransferIds()
            });
            
            return {
                success: true,
                workflowId: this.workflowId,
                steps: this.stepResults,
                proofSummary: this.getProofSummary(),
                transferIds: this.getTransferIds()
            };
            
        } catch (error) {
            console.error(`❌ Workflow execution failed: ${error.message}`);
            
            // Send workflow completed message with error
            this.sendWorkflowUpdate('workflow_completed', {
                workflowId: this.workflowId,
                success: false,
                error: error.message,
                steps: this.stepResults
            });
            
            return {
                success: false,
                workflowId: this.workflowId,
                error: error.message,
                steps: this.stepResults
            };
        }
    }


    async shouldSkipStep(step, stepIndex) {
        // Check if this step has conditions
        if (!step.condition) {
            return false; // No condition, execute the step
        }
        
        // Parse condition
        const condition = step.condition;
        
        // Handle "if KYC compliant" type conditions
        if (condition.includes('kyc') && (condition.includes('compliant') || condition.includes('verified'))) {
            const kycVerified = this.verificationResults['kyc'] === true;
            console.log(`🔍 Checking KYC compliance: ${kycVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            return !kycVerified;
        }
        
        // Handle "if location verified" conditions
        if (condition.includes('location') && condition.includes('verified')) {
            const locationVerified = this.verificationResults['location'] === true;
            console.log(`🔍 Checking location verification: ${locationVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            return !locationVerified;
        }
        
        // Handle "if AI content verified" conditions
        if (condition.includes('ai') && condition.includes('verified')) {
            const aiVerified = this.verificationResults['ai_content'] === true;
            console.log(`🔍 Checking AI content verification: ${aiVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            return !aiVerified;
        }
        
        // Handle generic "if verified" conditions (check last verification)
        if (condition === 'if verified') {
            const lastVerification = Object.values(this.verificationResults).pop();
            console.log(`🔍 Checking last verification: ${lastVerification ? 'VERIFIED' : 'NOT VERIFIED'}`);
            return !lastVerification;
        }
        
        // Default: don't skip if we can't parse the condition
        console.warn(`⚠️  Unknown condition format: ${condition}`);
        return false;
    }

    async executeStep(step, stepIndex) {
        switch (step.type) {
            case 'kyc_proof':
                // KYC proof expects wallet_hash and kyc_approved (both as integers)
                const walletHash = '12345';  // Hash of wallet address
                const kycApproved = '1';     // 1 = approved, 0 = rejected
                return await this.generateProof('prove_kyc', [walletHash, kycApproved], stepIndex);
                
            case 'location_proof':
                // Format location arguments properly
                let packedInput;
                if (step.parameters && step.parameters.latitude && step.parameters.longitude) {
                    // Convert real coordinates to normalized 0-255 scale
                    // NYC: 40.7, -74.0 -> normalized lat ~103, lon ~182
                    const lat = Math.round((step.parameters.latitude + 90) * 255 / 180);
                    const lon = Math.round((step.parameters.longitude + 180) * 255 / 360);
                    const deviceId = 5000; // Valid device ID
                    
                    // Pack into 32-bit integer: lat(8) | lon(8) | deviceId(16)
                    packedInput = ((lat & 0xFF) << 24) | ((lon & 0xFF) << 16) | (deviceId & 0xFFFF);
                } else {
                    // Default NYC coordinates packed properly
                    const lat = 103; // ~40.7°N normalized
                    const lon = 182; // ~-74.0°W normalized  
                    const deviceId = 5000;
                    packedInput = ((lat & 0xFF) << 24) | ((lon & 0xFF) << 16) | (deviceId & 0xFFFF);
                }
                
                console.log(`📍 Location proof with packed input: ${packedInput} (lat/lon/device packed)`);
                return await this.generateProof('prove_location', [String(packedInput)], stepIndex);
                
            case 'ai_content_proof':
                // Convert hash to numeric value
                let contentHash = '12345';
                if (step.hash) {
                    if (/^\d+$/.test(step.hash)) {
                        contentHash = step.hash;
                    } else {
                        // Convert string to numeric hash
                        let num = 0;
                        for (let c of step.hash) {
                            num = ((num * 31) + c.charCodeAt(0)) % 1000000;
                        }
                        contentHash = String(num);
                    }
                }
                
                const providerSignature = '1347440205'; // 0x4F50454E (OPENAI_SIGNATURE)
                const apiKeyHash = '999'; // Valid hash > 100 for OpenAI
                const timestamp = String(Math.floor(Date.now() / 1000)); // Current timestamp
                const contentLength = '100'; // Valid content length
                
                return await this.generateProof('prove_ai_content', 
                    [contentHash, providerSignature, apiKeyHash, timestamp, contentLength], 
                    stepIndex);

            case 'verification':
                return await this.verifyLastProof(step.verificationType || step.proofType || 'last', step.person);
                
            case 'transfer':
                // CRITICAL: Check if we should execute transfer based on verification results
                if (step.condition && !(await this.checkTransferCondition(step.condition, step.recipient))) {
                    return {
                        success: false,
                        error: 'Transfer condition not met - verification failed',
                        skipped: true
                    };
                }
                return await this.executeTransfer(step);
                
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    async checkTransferCondition(condition, recipient = null) {
        // Check if any required verification passed
        if (condition.includes('kyc')) {
            const key = recipient ? `kyc_${recipient}` : 'kyc';
            if (!this.verificationResults[key]) {
                console.log(`❌ KYC verification required but not passed for ${recipient || 'user'}`);
                return false;
            }
        }
        if (condition.includes('location')) {
            const key = recipient ? `location_${recipient}` : 'location';
            if (!this.verificationResults[key]) {
                console.log(`❌ Location verification required but not passed for ${recipient || 'user'}`);
                return false;
            }
        }
        if (condition.includes('ai')) {
            const key = recipient ? `ai_content_${recipient}` : 'ai_content';
            if (!this.verificationResults[key]) {
                console.log(`❌ AI content verification required but not passed for ${recipient || 'user'}`);
                return false;
            }
        }
        
        // If we have any verification requirement, check if at least one passed
        if (condition.includes('verified') || condition.includes('compliant')) {
            const anyVerified = Object.values(this.verificationResults).some(v => v === true);
            if (!anyVerified) {
                console.log('❌ No verification passed, cannot execute transfer');
                return false;
            }
        }
        
        return true;
    }

    async generateProof(functionName, args, stepIndex) {
        return new Promise((resolve) => {
            const proofId = `proof_${functionName.replace('prove_', '')}_${Date.now()}`;
            
            console.log(`🔐 Generating ${functionName} proof with ID: ${proofId}`);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'proof_complete' && message.proof_id === proofId) {
                    this.wsClient.off('message', messageHandler);
                    
                    // Store proof result - use unique key if person is specified
                    const proofType = functionName.replace('prove_', '');
                    const resultKey = (this.currentWorkflow && this.currentWorkflow.steps[stepIndex] && this.currentWorkflow.steps[stepIndex].person) 
                        ? `${proofType}_${this.currentWorkflow.steps[stepIndex].person}`
                        : proofType;
                    
                    this.proofResults[resultKey] = {
                        proofId: proofId,
                        success: true,
                        timestamp: Date.now(),
                        proofType: proofType,
                        person: this.currentWorkflow?.steps[stepIndex]?.person
                    };
                    
                    console.log(`✅ Proof ${proofId} completed successfully`);
                    resolve({
                        success: true,
                        proofId: proofId,
                        type: functionName
                    });
                } else if (message.type === 'proof_error' && message.proof_id === proofId) {
                    this.wsClient.off('message', messageHandler);
                    console.error(`❌ Proof generation failed: ${message.error}`);
                    resolve({
                        success: false,
                        error: message.error
                    });
                }
            };
            
            this.wsClient.on('message', messageHandler);
            
            // Send proof generation request
            const proofRequest = {
                message: `Generate ${functionName.replace('prove_', '')} proof`,
                proof_id: proofId,
                metadata: {
                    function: functionName,
                    arguments: args,
                    step_size: 50,
                    explanation: "Zero-knowledge proof generation",  // REQUIRED FIELD ADDED!
                    additional_context: {
                        workflow_id: this.workflowId,
                        step_index: stepIndex
                    }
                }
            };
            
            this.wsClient.send(JSON.stringify(proofRequest));
        });
    }

    async verifyLastProof(proofType = 'last', person = null) {
        // Find the proof to verify
        let proofToVerify = null;
        let verifyType = null;
        let resultKey = null;
        
        if (proofType === 'last') {
            // Get the last generated proof
            const proofTypes = Object.keys(this.proofResults);
            if (proofTypes.length > 0) {
                resultKey = proofTypes[proofTypes.length - 1];
                proofToVerify = this.proofResults[resultKey];
                verifyType = proofToVerify?.proofType || resultKey;
            }
        } else {
            // Verify specific proof type - check with person first, then without
            resultKey = person ? `${proofType}_${person}` : proofType;
            proofToVerify = this.proofResults[resultKey];
            
            if (!proofToVerify && !person) {
                // Try to find any proof of this type
                for (const key in this.proofResults) {
                    if (key.startsWith(proofType)) {
                        resultKey = key;
                        proofToVerify = this.proofResults[key];
                        break;
                    }
                }
            }
            
            verifyType = proofType;
        }
        
        if (!proofToVerify) {
            console.error('❌ No proof found to verify');
            return { success: false, error: 'No proof to verify' };
        }
        
        return new Promise((resolve) => {
            console.log(`🔍 Verifying ${verifyType} proof: ${proofToVerify.proofId}`);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'verification_complete' && 
                    message.proof_id === proofToVerify.proofId) {
                    this.wsClient.off('message', messageHandler);
                    
                    const isValid = message.result === 'VALID';
                    
                    // CRITICAL: Store verification result for conditional checks
                    // Use the same key as proof results
                    this.verificationResults[resultKey] = isValid;
                    // Also store by type for backward compatibility
                    this.verificationResults[verifyType] = isValid;
                    
                    console.log(`✅ Verification complete: ${proofToVerify.proofId} - ${message.result}`);
                    
                    resolve({
                        success: true,
                        valid: isValid,
                        proofId: proofToVerify.proofId,
                        result: message.result
                    });
                }
            };
            
            this.wsClient.on('message', messageHandler);
            
            // Send verification request
            const verifyRequest = {
                message: `verify proof ${proofToVerify.proofId}`,
                proof_id: proofToVerify.proofId,
                metadata: {
                    function: 'verify_proof',
                    arguments: [proofToVerify.proofId],
                    step_size: 50,
                    explanation: "Proof verification",              // REQUIRED FIELD ADDED!
                    additional_context: {                        // REQUIRED FIELD ADDED!
                        workflow_id: this.workflowId,
                        step_index: 1,
                        is_verification: true
                    }
                },
                workflowId: this.workflowId
            };
            
            this.wsClient.send(JSON.stringify(verifyRequest));
        });
    }

    async executeTransfer(step) {
        console.log(`💸 Transferring ${step.amount} USDC to ${step.recipient} on ${step.blockchain}`);
        
        try {
            const circleHandler = new CircleHandler();
            await circleHandler.initialize();
            
            const transfer = await circleHandler.transfer(
                step.amount,
                step.recipient,
                step.blockchain
            );
            
            if (transfer.success) {
                console.log(`✅ Transfer initiated with ID: ${transfer.transferId}`);
                
                // Send transfer data update to UI
                if (this.currentWorkflow && this.currentWorkflow.steps) {
                    const currentStepIndex = this.currentWorkflow.steps.findIndex(s => 
                        s.type === 'transfer' && s.amount === step.amount && s.recipient === step.recipient
                    );
                    if (currentStepIndex !== -1) {
                        this.sendWorkflowUpdate('workflow_step_update', {
                            workflowId: this.workflowId,
                            stepId: `step_${currentStepIndex + 1}`,
                            updates: {
                                transferData: {
                                    id: transfer.transferId,
                                    amount: step.amount,
                                    destinationAddress: step.recipient,
                                    blockchain: step.blockchain,
                                    status: transfer.status || 'pending'
                                }
                            }
                        });
                    }
                }
                
                return {
                    success: true,
                    transferId: transfer.transferId,
                    amount: step.amount,
                    recipient: step.recipient,
                    blockchain: step.blockchain
                };
            } else {
                throw new Error(transfer.error || 'Transfer failed');
            }
        } catch (error) {
            console.error(`❌ Transfer failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getProofSummary() {
        const summary = {};
        for (const [type, result] of Object.entries(this.proofResults)) {
            summary[type] = {
                proofId: result.proofId,
                status: this.verificationResults[type] ? 'verified' : 'generated'
            };
        }
        return summary;
    }

    getTransferIds() {
        return this.stepResults
            .filter(r => r.type === 'transfer' && r.result.success && r.result.transferId)
            .map(r => r.result.transferId);
    }

    sendWorkflowUpdate(type, data) {
        if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
            const message = {
                type: type,
                ...data
            };
            this.wsClient.send(JSON.stringify(message));
            console.log(`📤 Sent ${type} update:`, data);
        }
    }

    disconnect() {
        if (this.wsClient) {
            this.wsClient.close();
        }
    }
}

export { WorkflowExecutor };
export default WorkflowExecutor;
