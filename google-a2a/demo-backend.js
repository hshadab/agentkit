/**
 * Google A2A + NovaNet Demo Backend
 * Simulates Vertex AI agents with zkML verification
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Store agent conversations
const conversations = new Map();
const verifications = new Map();

// Simulate different Gemini agents
const agents = {
    'gemini-loan-processor': {
        name: 'Loan Processing Agent',
        model: 'gemini-1.5-pro',
        specialization: 'Financial analysis and loan approval',
        icon: '💰'
    },
    'gemini-medical-diagnosis': {
        name: 'Medical Diagnosis Agent',
        model: 'gemini-1.5-pro',
        specialization: 'Medical symptom analysis and diagnosis',
        icon: '🏥'
    },
    'gemini-fraud-detector': {
        name: 'Fraud Detection Agent',
        model: 'gemini-1.5-flash',
        specialization: 'Transaction pattern analysis',
        icon: '🔍'
    },
    'gemini-risk-assessor': {
        name: 'Risk Assessment Agent',
        model: 'gemini-1.5-flash',
        specialization: 'Risk evaluation and scoring',
        icon: '⚠️'
    }
};

// Simulate Gemini responses based on input
function simulateGeminiResponse(agentId, prompt) {
    const promptLower = prompt.toLowerCase();
    
    if (agentId === 'gemini-loan-processor') {
        if (promptLower.includes('approve') || promptLower.includes('50000') || promptLower.includes('720')) {
            return {
                decision: 'APPROVE',
                confidence: 0.92,
                reasoning: 'Credit score exceeds threshold (720 > 650), DTI ratio acceptable (35% < 43%), stable employment history',
                amount: '$50,000',
                terms: '5 years @ 6.5% APR',
                riskScore: 'Low'
            };
        } else if (promptLower.includes('deny') || promptLower.includes('reject')) {
            return {
                decision: 'DENY',
                confidence: 0.88,
                reasoning: 'Insufficient credit history, high debt-to-income ratio',
                recommendation: 'Reapply after 6 months of credit building'
            };
        }
    } else if (agentId === 'gemini-medical-diagnosis') {
        if (promptLower.includes('headache') || promptLower.includes('fever')) {
            return {
                decision: 'REFER_SPECIALIST',
                confidence: 0.87,
                reasoning: 'Symptoms consistent with potential neurological condition',
                urgency: 'Moderate',
                specialist: 'Neurologist',
                tests: ['MRI', 'Blood Panel']
            };
        }
    } else if (agentId === 'gemini-fraud-detector') {
        if (promptLower.includes('unusual') || promptLower.includes('fraud')) {
            return {
                decision: 'FLAG_SUSPICIOUS',
                confidence: 0.78,
                reasoning: 'Transaction patterns deviate from baseline by 3.2 standard deviations',
                riskFactors: ['Unusual location', 'High amount', 'New merchant'],
                recommendation: 'Manual review required'
            };
        }
    }
    
    // Default response
    return {
        decision: 'PROCESS',
        confidence: 0.95,
        reasoning: 'Request analyzed and validated successfully',
        status: 'Ready for next step'
    };
}

// Generate zkML proof (calls actual NovaNet backend if available)
async function generateZkProof(decision, confidence, model, input) {
    try {
        // Try to call actual zkML backend
        const response = await fetch('http://localhost:8002/zkml/prove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: {
                    prompt: input,
                    approve_confidence: Math.round(confidence * 100),
                    decision: decision === 'APPROVE' ? 1 : 0,
                    amount_valid: 1,
                    recipient_valid: 1
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Poll for completion
            let attempts = 0;
            while (attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const statusResponse = await fetch(`http://localhost:8002/zkml/status/${data.sessionId}`);
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    if (status.status === 'completed') {
                        return {
                            real: true,
                            proof: status.proof.proof_bytes,
                            framework: 'JOLT-Atlas',
                            proofTime: status.proofTime,
                            sessionId: data.sessionId
                        };
                    }
                }
                attempts++;
            }
        }
    } catch (error) {
        console.log('zkML backend not available, using simulation');
    }
    
    // Simulated proof if backend not available
    return {
        real: false,
        proof: '0x' + crypto.randomBytes(32).toString('hex'),
        framework: 'JOLT-Atlas (Simulated)',
        proofTime: Math.floor(Math.random() * 500) + 300,
        sessionId: crypto.randomBytes(16).toString('hex')
    };
}

// API Routes

// Get available agents
app.get('/api/agents', (req, res) => {
    res.json(agents);
});

// Process request with single agent
app.post('/api/agent/process', async (req, res) => {
    const { agentId, prompt, requireProof } = req.body;
    const conversationId = crypto.randomBytes(16).toString('hex');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get Gemini response
    const agentResponse = simulateGeminiResponse(agentId, prompt);
    
    // Generate proof if required
    let verification = null;
    if (requireProof) {
        const proof = await generateZkProof(
            agentResponse.decision,
            agentResponse.confidence,
            agents[agentId].model,
            prompt
        );
        
        verification = {
            enabled: true,
            verified: true,
            zkProof: proof.proof,
            framework: proof.framework,
            proofTime: proof.proofTime,
            sessionId: proof.sessionId,
            verifierContract: '0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944',
            chain: 'ethereum-sepolia',
            real: proof.real
        };
        
        verifications.set(conversationId, verification);
    }
    
    const result = {
        conversationId,
        agentId,
        agent: agents[agentId],
        input: prompt,
        response: agentResponse,
        verification,
        timestamp: new Date().toISOString()
    };
    
    conversations.set(conversationId, [result]);
    res.json(result);
});

// Multi-agent workflow
app.post('/api/workflow/multi-agent', async (req, res) => {
    const { prompt, agents: agentList, requireProof } = req.body;
    const workflowId = crypto.randomBytes(16).toString('hex');
    const steps = [];
    
    let currentInput = prompt;
    
    for (const agentId of agentList) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const agentResponse = simulateGeminiResponse(agentId, currentInput);
        
        let verification = null;
        if (requireProof) {
            const proof = await generateZkProof(
                agentResponse.decision,
                agentResponse.confidence,
                agents[agentId].model,
                currentInput
            );
            
            verification = {
                enabled: true,
                verified: true,
                zkProof: proof.proof,
                framework: proof.framework,
                proofTime: proof.proofTime,
                verifierContract: '0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944',
                chain: 'ethereum-sepolia',
                real: proof.real
            };
        }
        
        steps.push({
            agentId,
            agent: agents[agentId],
            input: currentInput,
            response: agentResponse,
            verification,
            timestamp: new Date().toISOString()
        });
        
        // Use current agent's output as next agent's input
        currentInput = `Previous agent (${agents[agentId].name}) decided: ${agentResponse.decision} with confidence ${agentResponse.confidence}. ${agentResponse.reasoning}`;
    }
    
    conversations.set(workflowId, steps);
    
    res.json({
        workflowId,
        steps,
        summary: {
            totalAgents: steps.length,
            allVerified: requireProof,
            totalProofTime: steps.reduce((sum, s) => sum + (s.verification?.proofTime || 0), 0),
            finalDecision: steps[steps.length - 1].response.decision
        }
    });
});

// A2A Protocol simulation - agent handoff
app.post('/api/a2a/handoff', async (req, res) => {
    const { fromAgent, toAgent, data, requireProof } = req.body;
    const handoffId = crypto.randomBytes(16).toString('hex');
    
    // Generate handoff proof
    let verification = null;
    if (requireProof) {
        const proof = await generateZkProof(
            'HANDOFF',
            1.0,
            agents[fromAgent].model,
            JSON.stringify(data)
        );
        
        verification = {
            type: 'handoff',
            zkProof: proof.proof,
            framework: proof.framework,
            proofTime: proof.proofTime,
            dataHash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),
            timestamp: Date.now()
        };
    }
    
    res.json({
        handoffId,
        status: 'SUCCESS',
        from: agents[fromAgent],
        to: agents[toAgent],
        verification,
        a2aMessage: {
            id: handoffId,
            protocol: 'a2a/v1',
            from: fromAgent,
            to: toAgent,
            content: data,
            verification
        }
    });
});

// Get conversation history
app.get('/api/conversation/:id', (req, res) => {
    const conversation = conversations.get(req.params.id);
    if (conversation) {
        res.json(conversation);
    } else {
        res.status(404).json({ error: 'Conversation not found' });
    }
});

// Get verification details
app.get('/api/verification/:id', (req, res) => {
    const verification = verifications.get(req.params.id);
    if (verification) {
        res.json(verification);
    } else {
        res.status(404).json({ error: 'Verification not found' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        agents: Object.keys(agents).length,
        conversations: conversations.size,
        verifications: verifications.size
    });
});

const PORT = 8003;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         Google A2A + NovaNet Demo Backend                   ║
║                                                              ║
║  Simulating Vertex AI Agents with zkML Verification         ║
║                                                              ║
║  Port: ${PORT}                                              ║
║  Agents: ${Object.keys(agents).length} Gemini models                             ║
║                                                              ║
║  Try the demo at: http://localhost:8000/google-a2a/         ║
╚══════════════════════════════════════════════════════════════╝
    `);
});