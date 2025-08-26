#!/bin/bash

echo "🔍 Debug Workflow UI Fix"
echo "========================"

# First, let's add more targeted debugging to the frontend
cat > ~/agentkit/add_ui_debug.js << 'EOF'
// Add this to your browser console before running the test

// Clear previous logs
console.clear();
console.log('🎯 UI DEBUG MODE ACTIVATED');

// Track workflow creation
const originalCreateWorkflowCard = createWorkflowCard;
createWorkflowCard = function(workflowId, description, steps) {
    console.log('📋 CREATE WORKFLOW CARD:', {
        workflowId: workflowId,
        description: description,
        stepCount: steps.length,
        steps: steps.map(s => s.type)
    });
    return originalCreateWorkflowCard.apply(this, arguments);
};

// Track step updates with detailed logging
const originalUpdateWorkflowStep = updateWorkflowStep;
updateWorkflowStep = function(workflowId, stepIndex, status, details) {
    console.log('🔄 UPDATE WORKFLOW STEP:', {
        workflowId: workflowId,
        stepIndex: stepIndex,
        status: status,
        details: details,
        stepElementExists: !!document.getElementById(`wf-step-${workflowId}-${stepIndex}`),
        workflowExists: activeWorkflows.has(workflowId)
    });
    
    // Check if element exists
    const stepEl = document.getElementById(`wf-step-${workflowId}-${stepIndex}`);
    if (!stepEl) {
        console.error('❌ STEP ELEMENT NOT FOUND:', `wf-step-${workflowId}-${stepIndex}`);
        
        // List all step elements that DO exist
        const allSteps = document.querySelectorAll('[id^="wf-step-"]');
        console.log('📋 Available step elements:', Array.from(allSteps).map(el => el.id));
    }
    
    return originalUpdateWorkflowStep.apply(this, arguments);
};

// Track handleMessage with workflow detection
const originalHandleMessage = handleMessage;
handleMessage = function(data) {
    // Extract workflow info
    let workflowInfo = {
        type: data.type,
        proofId: data.proof_id,
        directWorkflowId: data.workflowId,
        metadataWorkflowId: data.metadata?.workflow_id,
        contextWorkflowId: data.metadata?.additional_context?.workflow_id,
        stepIndex: data.metadata?.additional_context?.step_index
    };
    
    if (data.type && (data.type.includes('proof') || data.type.includes('verification') || data.type.includes('transfer'))) {
        console.log('📨 HANDLE MESSAGE:', workflowInfo);
    }
    
    return originalHandleMessage.apply(this, arguments);
};

// Track workflow mappings
console.log('🗺️ INITIAL STATE:');
console.log('Active Workflows:', Array.from(activeWorkflows.entries()));
console.log('Workflow Proofs:', Array.from(workflowProofs.entries()));

EOF

echo ""
echo "📋 Instructions:"
echo "1. Copy the debug code above to your browser console"
echo "2. Run: ./test_workflow_fix.sh"
echo "3. Watch the console for detailed logging"
echo ""
echo "Now let's run a test workflow..."

cd ~/agentkit
curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice on Solana if KYC compliant"}' | jq '.'

echo ""
echo "✅ Test sent. Check your browser console for:"
echo "   - 📋 CREATE WORKFLOW CARD messages"
echo "   - 🔄 UPDATE WORKFLOW STEP messages"
echo "   - 📨 HANDLE MESSAGE logs"
echo "   - ❌ Any error messages about missing elements"
