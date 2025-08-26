import json
import os
import time
from datetime import datetime, timedelta

def check_and_update_workflows():
    history_path = os.path.expanduser("~/agentkit/workflow_history.json")
    transfer_path = os.path.expanduser("~/agentkit/transfer_history.json")
    
    if not os.path.exists(history_path):
        return
    
    with open(history_path, 'r') as f:
        workflows = json.load(f)
    
    transfers = {}
    if os.path.exists(transfer_path):
        with open(transfer_path, 'r') as f:
            transfers = json.load(f)
    
    updated = False
    
    for wf_id, wf_data in workflows.items():
        if wf_data.get("status") != "completed":
            # Check if workflow has been running for more than 2 minutes
            created_at = datetime.fromisoformat(wf_data.get("createdAt", datetime.now().isoformat()))
            if datetime.now() - created_at > timedelta(minutes=2):
                # Check if any transfers were completed
                has_transfer = False
                for transfer_id, transfer_data in transfers.items():
                    if transfer_data.get("workflowId") == wf_id:
                        has_transfer = True
                        break
                
                if has_transfer or wf_data.get("results", {}).get("step_1", {}).get("transferId"):
                    # Mark as completed
                    workflows[wf_id]["status"] = "completed"
                    workflows[wf_id]["completedAt"] = datetime.now().isoformat()
                    updated = True
                    print(f"Marked workflow {wf_id} as completed")
    
    if updated:
        with open(history_path, 'w') as f:
            json.dump(workflows, f, indent=2)

if __name__ == "__main__":
    check_and_update_workflows()
