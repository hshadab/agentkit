// workflowMonitor.js - Monitor workflow execution status
import WorkflowManager from './workflowManager.js';

class WorkflowMonitor {
    constructor() {
        this.manager = new WorkflowManager();
    }
    
    displayWorkflow(workflowId) {
        const workflow = this.manager.getWorkflow(workflowId);
        if (!workflow) {
            console.log('Workflow not found');
            return;
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log(`Workflow: ${workflow.id}`);
        console.log(`Description: ${workflow.description}`);
        console.log(`Status: ${workflow.status}`);
        console.log(`Created: ${workflow.createdAt}`);
        if (workflow.updatedAt) {
            console.log(`Updated: ${workflow.updatedAt}`);
        }
        console.log('═'.repeat(60) + '\n');
        
        workflow.steps.forEach((step, i) => {
            const isCompleted = workflow.completedSteps.includes(i);
            const isCurrent = workflow.currentStep === i && workflow.status === 'executing';
            const status = isCompleted ? '✅' : (isCurrent ? '🔄' : '⏳');
            
            console.log(`${status} Step ${i + 1}: ${step.description}`);
            
            if (workflow.results[`step_${i}`]) {
                const result = workflow.results[`step_${i}`];
                if (result.transferId) {
                    console.log(`   └─ Transfer ID: ${result.transferId}`);
                    console.log(`   └─ Status: ${result.status || 'pending'}`);
                    if (result.finalStatus) {
                        console.log(`   └─ Final Status: ${result.finalStatus.status}`);
                        if (result.finalStatus.transactionHash && result.finalStatus.transactionHash !== 'pending') {
                            console.log(`   └─ Tx Hash: ${result.finalStatus.transactionHash}`);
                        }
                    }
                }
                if (result.proofId) {
                    console.log(`   └─ Proof ID: ${result.proofId}`);
                    console.log(`   └─ Status: ${result.status}`);
                }
            }
        });
        
        if (workflow.error) {
            console.log(`\n❌ Error: ${workflow.error}`);
        }
    }
    
    async watchWorkflow(workflowId, interval = 2000) {
        console.log(`Monitoring workflow ${workflowId}...`);
        console.log('Press Ctrl+C to stop\n');
        
        const checkStatus = () => {
            console.clear();
            this.displayWorkflow(workflowId);
            
            const workflow = this.manager.getWorkflow(workflowId);
            if (workflow && ['completed', 'failed'].includes(workflow.status)) {
                console.log(`\n${workflow.status === 'completed' ? '✅' : '❌'} Workflow ${workflow.status}`);
                process.exit(0);
            }
        };
        
        checkStatus();
        setInterval(checkStatus, interval);
    }
    
    listRecentWorkflows(limit = 10) {
        const workflows = Array.from(this.manager.workflows.values());
        const sorted = workflows.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, limit);
        
        console.log(`\n📋 Recent Workflows (showing ${sorted.length} of ${workflows.length}):\n`);
        
        sorted.forEach(wf => {
            const statusEmoji = {
                'created': '🆕',
                'executing': '🔄',
                'completed': '✅',
                'failed': '❌'
            }[wf.status] || '❓';
            
            console.log(`${statusEmoji} ${wf.id}`);
            console.log(`   Description: ${wf.description}`);
            console.log(`   Status: ${wf.status}`);
            console.log(`   Created: ${wf.createdAt}`);
            console.log(`   Steps: ${wf.completedSteps.length}/${wf.steps.length} completed`);
            console.log('');
        });
    }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new WorkflowMonitor();
    const command = process.argv[2];
    const workflowId = process.argv[3];
    
    switch(command) {
        case 'show':
            if (!workflowId) {
                console.log('Usage: node workflowMonitor.js show <workflow-id>');
            } else {
                monitor.displayWorkflow(workflowId);
            }
            break;
            
        case 'watch':
            if (!workflowId) {
                console.log('Usage: node workflowMonitor.js watch <workflow-id>');
            } else {
                monitor.watchWorkflow(workflowId);
            }
            break;
            
        case 'list':
            monitor.listRecentWorkflows();
            break;
            
        default:
            console.log('Usage: node workflowMonitor.js [show|watch|list] <workflow-id>');
            console.log('\nCommands:');
            console.log('  show <id>   - Show workflow status once');
            console.log('  watch <id>  - Monitor workflow in real-time');
            console.log('  list        - List recent workflows');
    }
}

export default WorkflowMonitor;
