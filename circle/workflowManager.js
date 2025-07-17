// workflowManager.js - Workflow State Management for Multi-Step Transactions
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WorkflowManager {
    constructor() {
        this.workflows = new Map();
        this.workflowHistoryFile = path.join(__dirname, '..', 'workflow_history.json');
        this.loadWorkflowHistory();
    }

    createWorkflow(description, steps) {
        const workflowId = `wf_${uuidv4()}`;
        const workflow = {
            id: workflowId,
            description: description,
            steps: steps,
            currentStep: 0,
            status: 'created',
            createdAt: new Date().toISOString(),
            completedSteps: [],
            results: {}
        };
        
        this.workflows.set(workflowId, workflow);
        this.saveWorkflowHistory();
        
        console.log(`✅ Created workflow ${workflowId}`);
        return workflow;
    }

    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }

    updateWorkflowStatus(workflowId, status) {
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.status = status;
            workflow.updatedAt = new Date().toISOString();
            this.saveWorkflowHistory();
        }
    }

    loadWorkflowHistory() {
        try {
            if (fs.existsSync(this.workflowHistoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.workflowHistoryFile, 'utf8'));
                
                // Handle both array and object formats
                if (Array.isArray(data)) {
                    data.forEach(workflow => {
                        this.workflows.set(workflow.id, workflow);
                    });
                } else {
                    // Object format
                    Object.entries(data).forEach(([id, workflow]) => {
                        this.workflows.set(id, workflow);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading workflow history:', error);
        }
    }

    saveWorkflowHistory() {
        try {
            console.log("📝 Saving workflow history...");
            const workflowsObj = {};
            this.workflows.forEach((workflow, id) => {
                workflowsObj[id] = workflow;
            });
            fs.writeFileSync(this.workflowHistoryFile, JSON.stringify(workflowsObj, null, 2));
            console.log(`✅ Saved ${Object.keys(workflowsObj).length} workflows to ${this.workflowHistoryFile}`);
        } catch (error) {
            console.error('Error saving workflow history:', error);
        }
    }
}

// CLI Test Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const manager = new WorkflowManager();
    
    switch(command) {
        case 'create':
            const testWorkflow = manager.createWorkflow(
                'Test ETH to SOL transfer sequence',
                [
                    { type: 'kyc_proof', description: 'Generate KYC proof' },
                    { type: 'transfer', blockchain: 'ETH', amount: '0.1', recipient: 'alice' },
                    { type: 'wait', duration: 5000 },
                    { type: 'transfer', blockchain: 'SOL', amount: '0.1', recipient: 'alice' }
                ]
            );
            console.log(JSON.stringify(testWorkflow, null, 2));
            break;
            
        case 'list':
            const workflows = Array.from(manager.workflows.values());
            console.log(`Found ${workflows.length} workflows:`);
            workflows.forEach(wf => {
                console.log(`- ${wf.id}: ${wf.description} (${wf.status})`);
            });
            break;
            
        case 'get':
            const workflowId = process.argv[3];
            const workflow = manager.getWorkflow(workflowId);
            if (workflow) {
                console.log(JSON.stringify(workflow, null, 2));
            } else {
                console.log('Workflow not found');
            }
            break;
            
        default:
            console.log('Usage: node workflowManager.js [create|list|get <id>]');
    }
}

export default WorkflowManager;
