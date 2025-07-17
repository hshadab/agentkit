import subprocess
import json

# Test creating a workflow directly
command = "node circle/workflowManager.js create test_id 'Test workflow' '{\"steps\":[{\"type\":\"test\"}]}'"
result = subprocess.run(command, shell=True, capture_output=True, text=True)

print("Create workflow test:")
print(f"Return code: {result.returncode}")
print(f"Output: {result.stdout}")
print(f"Error: {result.stderr}")

# Check if it was saved
with open('workflow_history.json', 'r') as f:
    history = json.load(f)
    if 'test_id' in history:
        print("\nWorkflow was saved successfully!")
    else:
        print("\nWorkflow was NOT saved")
        print(f"Available IDs: {list(history.keys())[-5:]}")
