// workflowExecutor_generic.js - Fixed version with proper conditional transfer logic
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import CircleHandler from '../../circle/circleHandler.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
        this.isBlockchainVerification = false; // Track if we're doing blockchain verification
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
                console.trace('WebSocket close stack trace:');
            });
        });
    }

    async executeWorkflow(parsedWorkflow, existingWorkflowId = null) {
        this.currentWorkflow = parsedWorkflow;
        this.workflowId = existingWorkflowId || `wf_${uuidv4()}`;
        this.proofResults = {};
        this.verificationResults = {};
        this.stepResults = [];
        
        console.log(`\n🚀 Starting workflow execution: ${this.workflowId}`);
        console.log(`📋 Using ${existingWorkflowId ? 'existing' : 'new'} workflow ID`);
        console.log(`📋 Steps to execute: ${parsedWorkflow.steps.length}`);
        console.log(`📋 WebSocket state: ${this.wsClient ? this.wsClient.readyState : 'no client'}`);
        console.log(`📋 WebSocket OPEN constant: ${WebSocket.OPEN}`);
        
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
                console.log(`[WORKFLOW] About to execute step ${i + 1}/${parsedWorkflow.steps.length}: ${step.type}`);
                const result = await this.executeStep(step, i);
                const endTime = Date.now();
                console.log(`[WORKFLOW] Step ${i + 1} completed in ${endTime - startTime}ms with result:`, result.success ? 'SUCCESS' : 'FAILED');
                
                // Send step update: completed or failed
                const updates = {
                    status: result.success ? 'completed' : 'failed',
                    endTime: endTime,
                    startTime: startTime,
                    result: result.success ? 'Success' : result.error
                };
                
                // Add specific data for reward steps
                if (step.type === 'claim_rewards') {
                    updates.rewardData = {
                        deviceId: step.device_id,
                        error: result.error,
                        claimed: result.success,
                        amount: result.amount,
                        txHash: result.txHash
                    };
                }
                
                // Add specific data for Avalanche commit steps
                if (step.type === 'commit_to_avalanche' && result.result) {
                    updates.commitData = {
                        recordId: result.result.recordId,
                        transactionHash: result.result.transactionHash,
                        blockNumber: result.result.blockNumber,
                        message: result.result.message
                    };
                }
                
                this.sendWorkflowUpdate('workflow_step_update', {
                    workflowId: this.workflowId,
                    stepId: stepId,
                    updates: updates
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
            // Check various KYC verification keys
            const kycKeys = Object.keys(this.verificationResults).filter(key => key.includes('kyc'));
            const kycVerified = kycKeys.some(key => this.verificationResults[key] === true);
            console.log(`🔍 Checking KYC compliance: ${kycVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            console.log(`   Available KYC results: ${JSON.stringify(kycKeys.map(k => ({ [k]: this.verificationResults[k] })))}`);
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
                // Use timestamp-based wallet hash to ensure uniqueness
                const kycTs = Date.now();
                const walletHash = (kycTs % 999999).toString();  // Use last 6 digits of timestamp
                const kycApproved = '1';     // 1 = approved, 0 = rejected
                console.log(`🎲 Using timestamp-based wallet hash: ${walletHash} for unique proof`);
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
                    // Use timestamp-based deviceId for uniqueness
                    const deviceId = 5000 + (Date.now() % 10000); // Vary device ID
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

            case 'generate_proof':
                // Handle generic generate_proof from OpenAI parser
                const proofType = step.proof_type || step.proofType;
                if (proofType === 'kyc') {
                    // Use timestamp-based wallet hash to ensure uniqueness
                    const kycTimestamp = Date.now();
                    const walletHash = (kycTimestamp % 999999).toString();  // Use last 6 digits of timestamp
                    const kycApproved = '1';
                    console.log(`🎲 Using timestamp-based wallet hash: ${walletHash} for unique proof`);
                    return await this.generateProof('prove_kyc', [walletHash, kycApproved], stepIndex);
                } else if (proofType === 'location') {
                    const lat = 103;
                    const lon = 182;
                    // Use timestamp-based deviceId for uniqueness
                    const deviceId = 5000 + (Date.now() % 10000); // Vary device ID
                    const packedInput = ((lat & 0xFF) << 24) | ((lon & 0xFF) << 16) | (deviceId & 0xFFFF);
                    console.log(`🎲 Using device ID: ${deviceId} for unique location proof`);
                    return await this.generateProof('prove_location', [String(packedInput)], stepIndex);
                } else if (proofType === 'ai_content' || proofType === 'ai') {
                    const contentHash = '12345';
                    const providerSignature = '1347440205';
                    const apiKeyHash = '999';
                    const aiTimestamp = String(Math.floor(Date.now() / 1000));
                    const contentLength = '100';
                    return await this.generateProof('prove_ai_content', 
                        [contentHash, providerSignature, apiKeyHash, aiTimestamp, contentLength], 
                        stepIndex);
                } else if (proofType === 'device_proximity') {
                    // Extract device ID from step or use default
                    const deviceIdStr = step.device_id || 'DEV123';
                    
                    // Convert device ID to numeric value (hash if string)
                    let deviceIdNum;
                    if (/^\d+$/.test(deviceIdStr)) {
                        deviceIdNum = deviceIdStr;
                    } else {
                        // Convert string to numeric hash
                        let hash = 0;
                        for (let c of deviceIdStr) {
                            hash = ((hash * 31) + c.charCodeAt(0)) % 999999;
                        }
                        deviceIdNum = String(hash);
                    }
                    
                    // Extract coordinates from step data or arguments
                    let x = step.x || step.arguments?.[1] || '5050';
                    let y = step.y || step.arguments?.[2] || '5050';
                    
                    // Validate coordinates are within reasonable bounds
                    x = String(Math.max(0, Math.min(10000, parseInt(x) || 5050)));
                    y = String(Math.max(0, Math.min(10000, parseInt(y) || 5050)));
                    
                    console.log(`📍 Device ${deviceIdStr} (ID: ${deviceIdNum}) at coordinates (${x}, ${y})`);
                    return await this.generateProof('prove_device_proximity', 
                        [deviceIdNum, x, y], 
                        stepIndex);
                } else if (proofType === 'medical_integrity') {
                    // Extract medical record parameters
                    const patientId = step.patient_id || '12345';
                    let recordHash = step.record_hash || '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
                    
                    // Handle incomplete hash
                    if (recordHash === '0x...' || recordHash === '0x' || recordHash.length < 66) {
                        recordHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
                        console.log(`Generated random record hash: ${recordHash}`);
                    }
                    
                    // First, create and commit the medical record on Avalanche
                    console.log('🏥 Creating medical record on Avalanche...');
                    
                    return new Promise((resolve) => {
                        const requestId = `medical_commit_${Date.now()}`;
                        
                        // Send request to frontend to create medical record on Avalanche
                        this.sendWorkflowUpdate('create_medical_record_with_commitment', {
                            workflowId: this.workflowId,
                            stepId: `step_${stepIndex + 1}`,
                            patientId: patientId,
                            recordHash: recordHash,
                            requestId: requestId
                        });
                        
                        // Handle response
                        const messageHandler = (data) => {
                            try {
                                const message = JSON.parse(data);
                                if (message.type === 'medical_record_complete' && message.requestId === requestId) {
                                    this.wsClient.off('message', messageHandler);
                                    
                                    if (message.success && message.recordData) {
                                        // Store the medical record data with blockchain info
                                        this.medicalRecordData = message.recordData;
                                        
                                        // Now generate the proof with the committed data
                                        const creationTimestamp = String(message.recordData.creation_timestamp || Math.floor(Date.now() / 1000) - 86400);
                                        const verificationTimestamp = String(Math.floor(Date.now() / 1000));
                                        
                                        // Convert to numeric values for WASM
                                        const patientIdNum = parseInt(patientId);
                                        const parsedHash = parseInt(recordHash.replace('0x', '').substring(0, 8), 16) || 12345678;
                                        const recordHashNum = parsedHash % 2147483647;
                                        
                                        console.log('🏥 Medical record committed, generating integrity proof:', {
                                            patientId: patientIdNum,
                                            recordHash: recordHashNum,
                                            creationTime: creationTimestamp,
                                            verificationTime: verificationTimestamp,
                                            transactionHash: message.recordData.transactionHash
                                        });
                                        
                                        // Generate proof with committed data
                                        this.generateProof('prove_medical_integrity',
                                            [String(patientIdNum), String(recordHashNum), creationTimestamp, verificationTimestamp],
                                            stepIndex
                                        ).then(proofResult => {
                                            resolve(proofResult);
                                        }).catch(error => {
                                            resolve({
                                                success: false,
                                                error: error.message
                                            });
                                        });
                                    } else {
                                        resolve({
                                            success: false,
                                            error: message.error || 'Failed to create medical record on Avalanche'
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error handling medical record response:', error);
                            }
                        };
                        
                        this.wsClient.on('message', messageHandler);
                        
                        // Timeout after 60 seconds
                        setTimeout(() => {
                            this.wsClient.off('message', messageHandler);
                            resolve({
                                success: false,
                                error: 'Medical record creation timed out'
                            });
                        }, 60000);
                    });
                } else {
                    throw new Error(`Unknown proof type: ${proofType}`);
                }
                break; // Add missing break statement
                
            case 'verification':
            case 'verify_proof':
                console.log('📋 Verify proof step:', JSON.stringify(step, null, 2));
                
                // FIRST check if proof ID is in the description (e.g., "Verify KYC proof with ID proof_kyc_1752343501908 locally")
                if (step.description) {
                    const proofIdMatch = step.description.match(/proof_\w+_\d+/);
                    if (proofIdMatch) {
                        console.log(`Found proof ID in description: ${proofIdMatch[0]}`);
                        return await this.verifyLastProof(proofIdMatch[0]);
                    }
                }
                
                // Check if proof ID might be in arguments
                if (step.arguments && step.arguments.length > 0) {
                    const firstArg = step.arguments[0];
                    if (firstArg && (firstArg.startsWith('proof_') || firstArg.startsWith('prove_'))) {
                        console.log(`Found proof ID in arguments: ${firstArg}`);
                        return await this.verifyLastProof(firstArg);
                    }
                }
                
                // Check if we have a specific proof_id (but skip if it's a placeholder like "pending_")
                if (step.proof_id && !step.proof_id.startsWith('pending_')) {
                    return await this.verifyLastProof(step.proof_id);
                }
                
                return await this.verifyLastProof(step.verificationType || step.proofType || step.proof_type || 'last', step.person);
                
            case 'verify_on_ethereum':
                return await this.verifyOnBlockchain('ethereum', step.proofType || step.proof_type, step.person, stepIndex);
                
            case 'verify_on_solana':
                return await this.verifyOnBlockchain('solana', step.proofType || step.proof_type, step.person, stepIndex);
                
            case 'verify_on_base':
                return await this.verifyOnBlockchain('base', step.proofType || step.proof_type, step.person, stepIndex);
                
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
                
            case 'list_proofs':
                return await this.listProofs(step.list_type || 'proofs');
                
            case 'process_with_ai':
                // AI processing will be handled by the system after workflow completion
                return {
                    success: true,
                    needsAIProcessing: true,
                    request: step.request || 'process',
                    context: step.context || 'general',
                    description: step.description
                };
                
            /* LEGACY - Now handled in generate_proof for medical_integrity
            case 'create_medical_record':
                console.log('🏥 Create medical record step:', JSON.stringify(step, null, 2));
                const patientId = step.patient_id || '12345';
                // Clean up record hash - remove any trailing dots
                let recordHash = step.record_hash || `0x${Math.random().toString(16).substring(2, 66)}`;
                if (recordHash.endsWith('...')) {
                    recordHash = recordHash.slice(0, -3) + Math.random().toString(16).substring(2, 11); // Replace dots with valid hex
                }
                
                // Send a message to the frontend to create the medical record
                return new Promise((resolve) => {
                    const requestId = `medical_record_${Date.now()}`;
                    
                    // Send creation request
                    this.sendWorkflowUpdate('medical_record_creation_request', {
                        workflowId: this.workflowId,
                        stepId: `step_${stepIndex + 1}`,
                        patientId: patientId,
                        recordHash: recordHash,
                        requestId: requestId
                    });
                    
                    // Wait for response
                    const messageHandler = (data) => {
                        try {
                            const message = JSON.parse(data);
                            if (message.type === 'medical_record_creation_response' && 
                                message.requestId === requestId) {
                                this.wsClient.off('message', messageHandler);
                                
                                if (message.success) {
                                    const result = {
                                        success: true,
                                        type: 'create_medical_record',
                                        patient_id: patientId,
                                        record_hash: recordHash,
                                        record_id: message.recordId,
                                        status: 'completed',
                                        description: `Medical record created for patient ${patientId}`
                                    };
                                    
                                    // Store the medical record data for later steps
                                    this.medicalRecordData = result;
                                    
                                    resolve(result);
                                } else {
                                    resolve({
                                        success: false,
                                        type: 'create_medical_record',
                                        patient_id: patientId,
                                        error: message.error || 'Failed to create medical record',
                                        status: 'failed'
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error processing medical record response:', error);
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // Set timeout
                    setTimeout(() => {
                        this.wsClient.off('message', messageHandler);
                        resolve({
                            success: false,
                            type: 'create_medical_record',
                            patient_id: patientId,
                            error: 'Medical record creation timed out',
                            status: 'timeout'
                        });
                    }, 60000); // 1 minute timeout
                });
                */
                
            case 'register_device':
                console.log('📱 Register device step:', JSON.stringify(step, null, 2));
                const deviceId = step.device_id || 'DEV_UNKNOWN';
                
                // Send a message to the frontend to perform the actual registration
                return new Promise((resolve) => {
                    const requestId = `register_${Date.now()}`;
                    
                    // Send registration request
                    this.sendWorkflowUpdate('device_registration_request', {
                        workflowId: this.workflowId,
                        stepId: `step_${stepIndex + 1}`,
                        deviceId: deviceId,
                        requestId: requestId
                    });
                    
                    // Wait for response
                    const messageHandler = (data) => {
                        try {
                            const message = JSON.parse(data);
                            if (message.type === 'device_registration_response' && 
                                message.requestId === requestId) {
                                this.wsClient.off('message', messageHandler);
                                
                                if (message.success) {
                                    resolve({
                                        success: true,
                                        type: 'register_device',
                                        device_id: deviceId,
                                        ioId: message.ioId,
                                        did: message.did,
                                        txHash: message.txHash,
                                        status: 'registered',
                                        message: `Device ${deviceId} registered on IoTeX blockchain`
                                    });
                                } else {
                                    resolve({
                                        success: false,
                                        type: 'register_device',
                                        device_id: deviceId,
                                        error: message.error || 'Registration failed'
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing registration response:', error);
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // Timeout after 120 seconds
                    setTimeout(() => {
                        this.wsClient.removeEventListener('message', messageHandler);
                        resolve({
                            success: false,
                            type: 'register_device',
                            device_id: deviceId,
                            error: 'Registration timeout'
                        });
                    }, 120000); // 2 minute timeout for device registration
                });
            
            /* LEGACY - Now handled in generate_proof for medical_integrity
            case 'commit_to_avalanche':
                console.log('💾 Commit to Avalanche step:', JSON.stringify(step, null, 2));
                
                // Get the medical record data from previous step
                const recordData = this.stepResults.find(r => r.type === 'create_medical_record');
                if (!recordData || !recordData.result.record_id) {
                    throw new Error('No medical record found to commit');
                }
                
                // Send commit request to frontend
                return new Promise((resolve, reject) => {
                    const requestId = `commit_avalanche_${Date.now()}`;
                    let timeoutId;
                    
                    const messageHandler = (data) => {
                        try {
                            const response = JSON.parse(data);
                            if (response.type === 'commit_result' && response.requestId === requestId) {
                                console.log('✅ Received Avalanche commit result');
                                clearTimeout(timeoutId);
                                this.wsClient.off('message', messageHandler);
                                
                                if (response.success) {
                                    resolve({
                                        type: 'commit_to_avalanche',
                                        status: 'completed',
                                        success: true,
                                        result: response.result,
                                        transactionHash: response.transactionHash
                                    });
                                } else {
                                    resolve({
                                        type: 'commit_to_avalanche',
                                        status: 'failed',
                                        success: false,
                                        error: response.error || 'Commit failed'
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('Error parsing commit response:', err);
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // Send commit request
                    this.wsClient.send(JSON.stringify({
                        type: 'commit_to_avalanche',
                        requestId: requestId,
                        recordType: step.record_type || 'medical_record',
                        recordId: recordData.result.record_id,
                        recordHash: recordData.result.record_hash || step.record_hash || '0x' + '0'.repeat(64),
                        patientId: recordData.result.patient_id
                    }));
                    
                    // Set timeout
                    timeoutId = setTimeout(() => {
                        this.wsClient.off('message', messageHandler);
                        reject(new Error('Avalanche commit timed out - please check MetaMask'));
                    }, 120000); // 2 minute timeout
                });
                
                break; // Add missing break statement
                */
                
            case 'verify_on_avalanche':
                console.log('🔗 Verify on Avalanche step:', JSON.stringify(step, null, 2));
                console.log('📋 Current proof results:', Object.keys(this.proofResults));
                console.log('📋 Proof results details:', JSON.stringify(this.proofResults, null, 2));
                const avalancheProofType = step.proof_type || 'medical_integrity';
                const person = step.person;
                
                // Find the proof to verify - check with person suffix first
                let avalancheProof = null;
                if (person) {
                    const keyWithPerson = `${avalancheProofType}_${person}`;
                    avalancheProof = this.proofResults[keyWithPerson];
                    console.log(`🔍 Looking for proof with key "${keyWithPerson}":`, avalancheProof ? 'FOUND' : 'NOT FOUND');
                }
                
                if (!avalancheProof) {
                    console.log(`🔍 Looking for proof with key "${avalancheProofType}"`);
                    avalancheProof = this.proofResults[avalancheProofType] || 
                                   Object.values(this.proofResults).find(p => p.type === avalancheProofType || p.proofType === avalancheProofType);
                    console.log(`🔍 Proof search result:`, avalancheProof ? 'FOUND' : 'NOT FOUND');
                }
                
                if (!avalancheProof) {
                    console.error(`❌ Available proofs:`, Object.entries(this.proofResults).map(([k, v]) => `${k}: type=${v.type}, proofType=${v.proofType}`));
                    throw new Error(`No ${avalancheProofType} proof found to verify on Avalanche`);
                }
                
                // Send verification request to frontend
                return new Promise((resolve, reject) => {
                    const requestId = `verify_avalanche_${Date.now()}`;
                    let timeoutId;
                    
                    const messageHandler = (data) => {
                        const response = JSON.parse(data);
                        console.log('[AVALANCHE_VERIFY] Received message:', response.type);
                        if (response.type === 'verification_result' && response.requestId === requestId) {
                            console.log('✅ Received Avalanche verification result');
                            console.log('[AVALANCHE_VERIFY] Response details:', JSON.stringify(response, null, 2));
                            clearTimeout(timeoutId);
                            this.wsClient.off('message', messageHandler);
                            
                            // Handle both success and failure cases
                            if (response.success) {
                                resolve({
                                    type: 'verify_on_avalanche',
                                    status: 'completed',
                                    result: response.result || { success: true },
                                    transactionHash: response.transactionHash,
                                    success: true
                                });
                            } else {
                                reject(new Error(response.error || 'Verification failed'));
                            }
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // For medical integrity proofs, include the medical record data
                    if (avalancheProofType === 'medical_integrity' && this.medicalRecordData) {
                        avalancheProof.record_id = this.medicalRecordData.avalanche_record_id || step.record_id;
                        avalancheProof.medicalRecordData = this.medicalRecordData;
                    }
                    
                    // Ensure avalancheProof has the required fields
                    if (!avalancheProof.proofId && !avalancheProof.proof_id) {
                        console.error('❌ No proof ID found in avalancheProof:', avalancheProof);
                        throw new Error('Proof ID missing for Avalanche verification');
                    }
                    
                    // Send verification request
                    const verifyMessage = {
                        type: 'verify_on_avalanche',
                        requestId: requestId,
                        proofData: avalancheProof,
                        proofType: avalancheProofType,
                        recordId: avalancheProof.record_id || step.record_id,
                        workflowId: this.workflowId,
                        stepId: `step_${stepIndex + 1}`
                    };
                    console.log('📤 Sending verify_on_avalanche message:', JSON.stringify(verifyMessage));
                    console.log('WebSocket state:', this.wsClient.readyState);
                    console.log('WebSocket connected:', this.wsClient.readyState === 1);
                    console.log('Proof ID being sent:', avalancheProof.proofId || avalancheProof.proof_id);
                    this.wsClient.send(JSON.stringify(verifyMessage));
                    
                    // Set timeout
                    timeoutId = setTimeout(() => {
                        this.wsClient.off('message', messageHandler);
                        reject(new Error('Avalanche verification timed out - please check MetaMask'));
                    }, 120000); // 2 minute timeout
                });
                
                break; // Add missing break statement
                
            case 'verify_on_iotex':
                console.log('🔗 Verify on IoTeX step:', JSON.stringify(step, null, 2));
                const iotexProofType = step.proof_type || 'device_proximity';
                
                // Debug: log available proofs
                console.log('📋 Available proofs:', Object.keys(this.proofResults));
                console.log('📋 Looking for proof type:', iotexProofType);
                console.log('📋 Proof results detail:', JSON.stringify(this.proofResults, null, 2));
                
                // Find the proof to verify
                const proofToVerify = this.proofResults[iotexProofType] || 
                                    Object.values(this.proofResults).find(p => p.type === iotexProofType || p.proofType === iotexProofType);
                
                if (!proofToVerify) {
                    console.error('❌ Proof results:', this.proofResults);
                    throw new Error(`No ${iotexProofType} proof found to verify on IoTeX`);
                }
                
                // Send verification request to frontend
                return new Promise((resolve) => {
                    const requestId = `verify_iotex_${Date.now()}`;
                    
                    this.sendWorkflowUpdate('iotex_verification_request', {
                        workflowId: this.workflowId,
                        stepId: `step_${stepIndex + 1}`,
                        proofId: proofToVerify.proofId,
                        proofType: iotexProofType,
                        deviceId: step.device_id,
                        requestId: requestId
                        // Don't send full proof data - frontend will fetch via HTTP
                    });
                    
                    // Wait for response
                    const messageHandler = (data) => {
                        try {
                            const message = JSON.parse(data);
                            if (message.type === 'iotex_verification_response' && 
                                message.requestId === requestId) {
                                this.wsClient.off('message', messageHandler);
                                
                                if (message.success) {
                                    resolve({
                                        success: true,
                                        type: 'verify_on_iotex',
                                        proofId: proofToVerify.proofId,
                                        txHash: message.txHash,
                                        message: `Proof verified on IoTeX blockchain`
                                    });
                                } else {
                                    resolve({
                                        success: false,
                                        type: 'verify_on_iotex',
                                        error: message.error || 'Verification failed'
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing verification response:', error);
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // Timeout after 120 seconds
                    setTimeout(() => {
                        this.wsClient.removeEventListener('message', messageHandler);
                        resolve({
                            success: false,
                            type: 'verify_on_iotex',
                            error: 'Verification timeout'
                        });
                    }, 120000); // 2 minute timeout for IoTeX verification
                });
                
            case 'claim_rewards':
                console.log('💰 Claim rewards step:', JSON.stringify(step, null, 2));
                
                // For IoT devices, send request to frontend to claim IOTX rewards
                return new Promise((resolve) => {
                    const requestId = `claim_rewards_${Date.now()}`;
                    const deviceId = step.device_id || this.proofResults.device_proximity?.deviceId || 'TESTDEVICE001';
                    
                    this.sendWorkflowUpdate('claim_rewards_request', {
                        workflowId: this.workflowId,
                        stepId: `step_${stepIndex + 1}`,
                        deviceId: deviceId,
                        requestId: requestId
                    });
                    
                    // Wait for response
                    const messageHandler = (data) => {
                        try {
                            const message = JSON.parse(data);
                            if (message.type === 'claim_rewards_response' && 
                                message.requestId === requestId) {
                                this.wsClient.off('message', messageHandler);
                                
                                if (message.success) {
                                    resolve({
                                        success: true,
                                        type: 'claim_rewards',
                                        device_id: deviceId,
                                        amount: message.amount || '0.01 IOTX',
                                        currency: 'IOTX',
                                        txHash: message.txHash,
                                        status: 'claimed',
                                        message: `Rewards claimed for device ${deviceId}: ${message.amount || '0.01'} IOTX`
                                    });
                                } else {
                                    resolve({
                                        success: false,
                                        type: 'claim_rewards',
                                        error: message.error || 'Reward claim failed'
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing reward claim response:', error);
                        }
                    };
                    
                    this.wsClient.on('message', messageHandler);
                    
                    // Timeout after 120 seconds
                    setTimeout(() => {
                        this.wsClient.removeEventListener('message', messageHandler);
                        resolve({
                            success: false,
                            type: 'claim_rewards',
                            error: 'Reward claim timeout'
                        });
                    }, 120000); // 2 minute timeout for reward claim
                });
                
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    async checkTransferCondition(condition, recipient = null) {
        console.log(`🔍 Checking transfer condition: "${condition}" for recipient: ${recipient}`);
        console.log(`   Available verification results:`, this.verificationResults);
        
        // Check if any required verification passed
        if (condition.includes('kyc')) {
            // Don't check recipient-specific keys - check ALL KYC verifications
            const kycKeys = Object.keys(this.verificationResults).filter(key => 
                key.includes('kyc') && this.verificationResults[key] === true
            );
            
            const kycVerified = kycKeys.length > 0;
            
            if (!kycVerified) {
                console.log(`❌ KYC verification required but no KYC verifications found`);
                console.log(`   All verification keys: ${Object.keys(this.verificationResults).join(', ')}`);
                return false;
            }
            console.log(`✅ KYC verification found: ${kycKeys.join(', ')}`);
        }
        if (condition.includes('location')) {
            // Check ALL location verifications
            const locationKeys = Object.keys(this.verificationResults).filter(key => 
                key.includes('location') && this.verificationResults[key] === true
            );
            
            if (locationKeys.length === 0) {
                console.log(`❌ Location verification required but no location verifications found`);
                return false;
            }
            console.log(`✅ Location verification found: ${locationKeys.join(', ')}`);
        }
        if (condition.includes('ai')) {
            // Check ALL AI content verifications
            const aiKeys = Object.keys(this.verificationResults).filter(key => 
                key.includes('ai') && this.verificationResults[key] === true
            );
            
            if (aiKeys.length === 0) {
                console.log(`❌ AI content verification required but no AI verifications found`);
                return false;
            }
            console.log(`✅ AI content verification found: ${aiKeys.join(', ')}`);
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
            // Generate cleaner proof IDs for AI predictions
            let proofType = functionName.replace('prove_', '');
            if (proofType === 'ai_content') {
                proofType = 'ai_prediction';
            }
            const proofId = `proof_${proofType}_${Date.now()}`;
            
            console.log(`Generating ${functionName} proof with ID: ${proofId}`);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'proof_complete' && message.proof_id === proofId) {
                    console.log(`📨 Received proof_complete for ${proofId}`, {
                        hasProofData: !!message.proof_data,
                        proofDataLength: message.proof_data?.length,
                        hasPublicInputs: !!message.public_inputs
                    });
                    
                    clearTimeout(timeoutId); // Clear the timeout
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
                        type: proofType, // Add type field for consistency
                        proofType: proofType,
                        person: this.currentWorkflow?.steps[stepIndex]?.person,
                        metrics: message.metrics, // Capture real metrics from zkEngine
                        proof_data: message.proof_data, // Include binary proof data
                        public_inputs: message.public_inputs, // Include public inputs
                        metadata: message.metadata // Include metadata
                    };
                    
                    console.log(`✅ Proof ${proofId} completed successfully`);
                    resolve({
                        success: true,
                        proofId: proofId,
                        type: functionName,
                        metrics: message.metrics // Pass metrics to the result
                    });
                } else if (message.type === 'proof_error' && message.proof_id === proofId) {
                    clearTimeout(timeoutId); // Clear the timeout
                    this.wsClient.off('message', messageHandler);
                    console.error(`❌ Proof generation failed: ${message.error}`);
                    resolve({
                        success: false,
                        error: message.error
                    });
                }
            };
            
            this.wsClient.on('message', messageHandler);
            
            // Add timeout for proof generation
            const timeoutId = setTimeout(() => {
                this.wsClient.off('message', messageHandler);
                console.error(`❌ Proof generation timeout for ${proofId}`);
                resolve({
                    success: false,
                    error: 'Proof generation timeout after 90 seconds'
                });
            }, 90000); // 90 second timeout
            
            // Send proof generation request
            const proofRequest = {
                content: `Generate ${functionName.replace('prove_', '')} proof`,
                proof_id: proofId,
                metadata: {
                    function: functionName,
                    arguments: args,
                    // Use smaller step size for medical proofs to reduce data size
                    step_size: functionName === 'prove_medical_integrity' ? 10 : 50,
                    explanation: "Zero-knowledge proof generation",  // REQUIRED FIELD ADDED!
                    additional_context: {
                        workflow_id: this.workflowId,
                        step_index: stepIndex,
                        // Include medical record data if this is a medical integrity proof
                        ...(functionName === 'prove_medical_integrity' && this.medicalRecordData ? {
                            medicalRecordData: this.medicalRecordData
                        } : {})
                    }
                }
            };
            
            this.wsClient.send(JSON.stringify(proofRequest));
        });
    }


    async verifyLastProof(proofType = 'last', person = null) {
        console.log(`🔍 verifyLastProof called with proofType: ${proofType}, person: ${person}`);
        
        // Check if proofType looks like a proof ID (e.g., proof_kyc_1234567890 or prove_kyc_1234567890)
        if (proofType && (proofType.startsWith('proof_') || proofType.startsWith('prove_')) && proofType.includes('_')) {
            // This is a specific proof ID - just send it to backend
            const proofId = proofType;
            
            return new Promise((resolve) => {
                console.log(`🔍 Verifying proof by ID: ${proofId}`);
                
                const messageHandler = (data) => {
                    const message = JSON.parse(data);
                    
                    if (message.type === 'verification_complete' && 
                        message.proof_id === proofId) {
                        // Skip if we're doing blockchain verification
                        if (this.isBlockchainVerification) {
                            console.log('⏭️ Skipping local verification during blockchain verification');
                            return;
                        }
                        
                        this.wsClient.off('message', messageHandler);
                        
                        const isValid = message.result === 'VALID';
                        console.log(`✅ Verification result: ${isValid ? 'VALID' : 'INVALID'}`);
                        
                        resolve({
                            success: true,
                            valid: isValid,
                            proofId: proofId
                        });
                    } else if (message.type === 'verification_error' && message.proof_id === proofId) {
                        this.wsClient.off('message', messageHandler);
                        console.error(`❌ Verification failed: ${message.error}`);
                        resolve({
                            success: false,
                            error: message.error
                        });
                    }
                };
                
                this.wsClient.on('message', messageHandler);
                
                // Send verification request - backend will handle loading from disk
                const verifyRequest = {
                    message: `Verify proof ${proofId}`,
                    proof_id: proofId,
                    metadata: {
                        function: 'verify_proof',
                        arguments: [proofId],
                        step_size: 50,
                        explanation: "Verifying proof",
                        additional_context: {
                            workflow_id: this.workflowId,
                            is_verification: true
                        }
                    },
                    workflowId: this.workflowId
                };
                
                this.wsClient.send(JSON.stringify(verifyRequest));
            });
        }
        
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
            console.error('❌ No proof found to verify in memory');
            return { success: false, error: 'No proof to verify' };
        }
        
        return new Promise((resolve) => {
            console.log(`🔍 Verifying ${verifyType} proof: ${proofToVerify.proofId}`);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'verification_complete' && 
                    message.proof_id === proofToVerify.proofId) {
                    // Skip if we're doing blockchain verification
                    if (this.isBlockchainVerification) {
                        console.log('⏭️ Skipping local verification during blockchain verification');
                        return;
                    }
                    
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

    async verifyOnBlockchain(blockchain, proofType, person = null, stepIndex = 0) {
        // Set flag to indicate blockchain verification is in progress
        this.isBlockchainVerification = true;
        
        // Find the proof to verify on blockchain
        let proofToVerify = null;
        let resultKey = null;
        
        // Check with person first, then without
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
        
        if (!proofToVerify) {
            console.error(`❌ No ${proofType} proof found to verify on ${blockchain}`);
            this.isBlockchainVerification = false;
            return { success: false, error: `No ${proofType} proof to verify` };
        }
        
        console.log(`🔐 Verifying ${proofType} proof on ${blockchain}: ${proofToVerify.proofId}`);
        
        // For blockchain verification, we need to use the frontend directly
        // since the backend doesn't handle blockchain-specific verification
        try {
            // Get proof data from backend first
            const proofDataResponse = await fetch(`http://localhost:8001/api/proof/${proofToVerify.proofId}/${blockchain.toLowerCase()}`);
            if (!proofDataResponse.ok) {
                throw new Error(`Failed to get proof data: ${proofDataResponse.statusText}`);
            }
            
            const proofData = await proofDataResponse.json();
            console.log(`📦 Got proof data for ${blockchain} verification`);
            
            // Small delay to ensure WebSocket is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Send verification request to frontend
            this.sendWorkflowUpdate('blockchain_verification_request', {
                workflowId: this.workflowId,
                stepId: `step_${stepIndex + 1}`,
                proofId: proofToVerify.proofId,
                proofType: proofType,
                blockchain: blockchain.toUpperCase(),
                proofData: proofData
            });
            
            console.log(`⏳ Waiting for user to verify on ${blockchain}...`);
            
            // Wait for verification response from frontend
            const verificationPromise = new Promise((resolve) => {
                const messageHandler = (data) => {
                    const message = JSON.parse(data);
                    
                    // Debug: log all blockchain verification responses
                    if (message.type === 'blockchain_verification_response') {
                        console.log(`📨 Received blockchain verification response:`, JSON.stringify(message));
                    }
                    
                    if (message.type === 'blockchain_verification_response' && 
                        message.proof_id === proofToVerify.proofId &&
                        message.blockchain === blockchain.toUpperCase()) {
                        
                        this.wsClient.off('message', messageHandler);
                        
                        if (message.success) {
                            // Store blockchain verification result
                            const blockchainKey = `${resultKey}_${blockchain}`;
                            this.verificationResults[blockchainKey] = true;
                            
                            // ALSO store under the base key for transfer conditions
                            this.verificationResults[resultKey] = true;
                            this.verificationResults[proofType] = true;
                            
                            // Send verification update through WebSocket
                            this.sendWorkflowUpdate('blockchain_verification_update', {
                                workflowId: this.workflowId,
                                proofId: proofToVerify.proofId,
                                blockchain: blockchain.toUpperCase(),
                                transactionHash: message.transaction_hash,
                                explorerUrl: message.explorer_url,
                                success: true
                            });
                            
                            console.log(`✅ ${blockchain} verification complete: ${proofToVerify.proofId}`);
                            console.log(`   Transaction: ${message.transaction_hash}`);
                            
                            resolve({
                                success: true,
                                valid: true,
                                proofId: proofToVerify.proofId,
                                blockchain: blockchain.toUpperCase(),
                                transactionHash: message.transaction_hash,
                                explorerUrl: message.explorer_url
                            });
                        } else {
                            console.log(`❌ ${blockchain} verification failed: ${message.error}`);
                            resolve({
                                success: false,
                                error: message.error || 'Verification failed'
                            });
                        }
                    }
                };
                
                this.wsClient.on('message', messageHandler);
                
                // Add timeout
                setTimeout(() => {
                    this.wsClient.off('message', messageHandler);
                    this.isBlockchainVerification = false; // Reset flag on timeout
                    resolve({
                        success: false,
                        error: 'Verification timeout - no response from frontend'
                    });
                }, 120000); // 2 minute timeout
            });
            
            // Wait for the promise to resolve and reset the flag
            const result = await verificationPromise;
            this.isBlockchainVerification = false; // Reset flag after completion
            return result;
            
        } catch (error) {
            console.error(`❌ ${blockchain} verification failed:`, error);
            this.isBlockchainVerification = false; // Reset flag on error
            return {
                success: false,
                error: error.message || `${blockchain} verification failed`,
                proofId: proofToVerify.proofId
            };
        }
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

    async listProofs(listType = 'proofs') {
        return new Promise((resolve) => {
            console.log(`📋 Listing ${listType}...`);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'list_complete') {
                    this.wsClient.off('message', messageHandler);
                    
                    console.log(`✅ Retrieved ${message.items?.length || 0} ${listType}`);
                    
                    resolve({
                        success: true,
                        items: message.items || [],
                        count: message.items?.length || 0
                    });
                }
            };
            
            this.wsClient.on('message', messageHandler);
            
            // Send list request
            const listRequest = {
                message: `list ${listType}`,
                metadata: {
                    function: 'list_proofs',
                    arguments: [listType],
                    step_size: 50,
                    explanation: `Listing ${listType}`,
                    additional_context: null
                },
                workflowId: this.workflowId
            };
            
            this.wsClient.send(JSON.stringify(listRequest));
        });
    }

    getTransferIds() {
        return this.stepResults
            .filter(r => r.type === 'transfer' && r.result && r.result.success && r.result.transferId)
            .map(r => r.result.transferId);
    }

    sendWorkflowUpdate(type, data) {
        console.log(`📤 Attempting to send ${type}`);
        console.log(`📤 WebSocket client exists: ${!!this.wsClient}`);
        console.log(`📤 WebSocket readyState: ${this.wsClient ? this.wsClient.readyState : 'no client'}`);
        
        if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
            const message = {
                type: type,
                ...data
            };
            const jsonMessage = JSON.stringify(message);
            console.log(`📤 Sending ${type} via WebSocket:`, jsonMessage);
            this.wsClient.send(jsonMessage);
            console.log(`✅ ${type} sent successfully`);
        } else {
            console.log(`❌ Cannot send ${type} - WebSocket not ready`);
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
