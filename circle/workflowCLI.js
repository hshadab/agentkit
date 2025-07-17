// workflowCLI.js - CLI interface for complete workflow system
import WorkflowManager from './workflowManager.js';
import WorkflowParser from './workflowParser.js';
import WorkflowExecutor from './workflowExecutor.js';

class WorkflowCLI {
    constructor() {
        this.manager = new WorkflowManager();
        this.parser = new WorkflowParser();
        // Pass the shared manager to executor
        this.executor = new WorkflowExecutor(this.manager);
    }
    
    async processCommand(command) {
        console.log(`\n🤖 Processing: "${command}"\n`);
        
        // Parse the command
        const parsed = this.parser.parseCommand(command);
        console.log('📋 Parsed workflow:');
        console.log(JSON.stringify(parsed, null, 2));
        
        // Create workflow
        const workflow = this.manager.createWorkflow(parsed.description, parsed.steps);
        console.log(`\n✅ Created workflow: ${workflow.id}`);
        
        // Debug: verify workflow exists
        const verifyWorkflow = this.manager.getWorkflow(workflow.id);
        console.log(`\n🔍 Debug - Workflow exists in manager: ${verifyWorkflow ? 'YES' : 'NO'}`);
        
        // Debug: check if executor can see it
        const executorCheck = this.executor.manager.getWorkflow(workflow.id);
        console.log(`🔍 Debug - Workflow exists in executor's manager: ${executorCheck ? 'YES' : 'NO'}`);
        
        // Show execution plan
        console.log('\n🔄 Ready to execute workflow with the following steps:');
        workflow.steps.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step.description}`);
        });
        
        return workflow;
    }
    
    async executeCommand(command) {
        const workflow = await this.processCommand(command);
        
        // Force save before execution
        this.manager.saveWorkflowHistory();
        
        console.log('\n▶️  Starting execution in 3 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug: Final check
        const finalCheck = this.executor.manager.getWorkflow(workflow.id);
        console.log(`🔍 Debug - Final check before execution: ${finalCheck ? 'YES' : 'NO'}`);
        
        return this.executor.executeWorkflow(workflow.id);
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const cli = new WorkflowCLI();
    const command = process.argv.slice(2).join(' ');
    
    if (!command) {
        console.log('Usage: node workflowCLI.js <natural language command>');
        console.log('\nExamples:');
        console.log('  node workflowCLI.js "Send 0.01 USDC to alice then send 0.01 to bob on SOL"');
        console.log('  node workflowCLI.js "Generate KYC proof then transfer 0.01 to alice on ETH and finally send 0.01 to bob on solana"');
        console.log('  node workflowCLI.js "Send 0.01 USDC to alice on ethereum if KYC compliant and then do the same on solana"');
    } else {
        cli.executeCommand(command).catch(console.error);
    }
}

export default WorkflowCLI;
