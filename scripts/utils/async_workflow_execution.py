import asyncio
import os
import json
from datetime import datetime

async def execute_workflow_async(command: str):
    """Execute workflow asynchronously without blocking"""
    env = os.environ.copy()
    env.update({
        'ZKENGINE_BINARY': '/home/hshadab/agentkit/zkengine_binary/zkEngine',
        'WASM_DIR': '/home/hshadab/agentkit/zkengine_binary',
        'PROOFS_DIR': '/home/hshadab/agentkit/proofs'
    })
    
    # Create workflow ID
    workflow_id = f"wf_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        # Use asyncio subprocess instead of blocking subprocess.run
        proc = await asyncio.create_subprocess_exec(
            'node', 'workflowCLI_generic.js', command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.expanduser("~/agentkit/circle"),
            env=env
        )
        
        # Wait with timeout
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), 
            timeout=300.0  # 5 minute timeout
        )
        
        return {
            "success": proc.returncode == 0,
            "workflowId": workflow_id,
            "output": stdout.decode() if stdout else "",
            "error": stderr.decode() if stderr and proc.returncode != 0 else None
        }
        
    except asyncio.TimeoutError:
        # Kill the process if it times out
        proc.kill()
        return {
            "success": False,
            "workflowId": workflow_id,
            "error": "Workflow execution timed out after 5 minutes"
        }

# Update the execute_workflow endpoint to use this
@app.post("/execute_workflow")
async def execute_workflow(request: WorkflowRequest):
    """Execute workflow asynchronously"""
    try:
        result = await execute_workflow_async(request.command)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}
