import subprocess
import json
import os

# Get the latest workflow from history
history_path = "workflow_history.json"
if os.path.exists(history_path):
    with open(history_path, 'r') as f:
        history = json.load(f)
    
    # Get workflows sorted by creation time
    workflows = [(k, v) for k, v in history.items()]
    workflows.sort(key=lambda x: x[1].get('createdAt', ''), reverse=True)
    
    # Find first "created" workflow
    for wf_id, wf_data in workflows:
        if wf_data.get('status') == 'created':
            print(f"Found stuck workflow: {wf_id}")
            print(f"Description: {wf_data.get('description')}")
            
            # Execute it manually
            command = wf_data.get('description', 'Test workflow')
            cli_command = f"node circle/workflowCLI_generic.js '{command}'"
            
            print(f"\nExecuting: {cli_command}")
            
            result = subprocess.run(
                cli_command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=os.path.expanduser("~/agentkit")
            )
            
            print(f"\nReturn code: {result.returncode}")
            print(f"Output:\n{result.stdout}")
            if result.stderr:
                print(f"Stderr:\n{result.stderr}")
            
            break
    else:
        print("No stuck workflows found")
else:
    print("workflow_history.json not found")
