import re

with open('/home/hshadab/agentkit/langchain_service.py', 'r') as f:
    content = f.read()

# Find the workflow_status function
func_start = content.find('@app.post("/workflow_status")')
if func_start == -1:
    print("Could not find workflow_status function")
    exit(1)

# Find the end of the function (next @app or function def)
func_end = len(content)
for pattern in ['@app.', 'def ', '@app.get', '@app.post']:
    next_pos = content.find(pattern, func_start + 20)
    if next_pos > 0 and next_pos < func_end:
        func_end = next_pos

# Replace the entire function
new_function = '''@app.post("/workflow_status")
async def workflow_status(request: WorkflowStatusRequest):
    """Get the status of a workflow"""
    try:
        print(f"[DEBUG] workflow_status called for: {request.workflowId}")
        # Read the workflow history file directly
        history_path = os.path.expanduser("~/agentkit/workflow_history.json")
        
        if os.path.exists(history_path):
            with open(history_path, 'r') as f:
                history = json.load(f)
            
            workflow_data = history.get(request.workflowId)
            
            if not workflow_data:
                return {
                    "success": False,
                    "error": f"Workflow {request.workflowId} not found"
                }
            
            # Build response with step details
            steps = []
            for i, step in enumerate(workflow_data.get("steps", [])):
                step_status = "pending"
                
                # Check if step is completed
                if i in workflow_data.get("completedSteps", []):
                    step_status = "completed"
                elif i == workflow_data.get("currentStep", -1):
                    step_status = "executing"
                
                # Check results for this step
                step_result = workflow_data.get("results", {}).get(f"step_{i}", {})
                if step_result.get("error"):
                    step_status = "failed"
                elif step_result.get("skipped"):
                    step_status = "skipped"
                elif step_result:
                    step_status = "completed"
                
                steps.append({
                    "step": i,
                    "status": step_status,
                    "description": step.get("description", step.get("type", "Unknown step"))
                })
            
            # Get the actual status from workflow data
            actual_status = workflow_data.get("status", "unknown")
            print(f"[DEBUG] Returning status: {actual_status} for {request.workflowId}")
            
            return {
                "success": True,
                "workflowId": request.workflowId,
                "status": actual_status,
                "steps": steps,
                "currentStep": workflow_data.get("currentStep", -1),
                "results": workflow_data.get("results", {})
            }
        else:
            return {
                "success": False,
                "error": "Workflow history file not found"
            }
            
    except Exception as e:
        print(f"[DEBUG] Error in workflow_status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

'''

# Replace the function
content = content[:func_start] + new_function + content[func_end:]

with open('/home/hshadab/agentkit/langchain_service.py', 'w') as f:
    f.write(content)

print("Replaced workflow_status function to read from workflow_history.json")
