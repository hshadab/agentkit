import json
import os

root_path = "/home/hshadab/agentkit/workflow_history.json"
circle_path = "/home/hshadab/agentkit/circle/workflow_history.json"

# Read both files
with open(root_path, 'r') as f:
    root_workflows = json.load(f)

circle_workflows = {}
if os.path.exists(circle_path):
    with open(circle_path, 'r') as f:
        circle_workflows = json.load(f)

# Merge (circle workflows override root if duplicate)
merged = {**root_workflows, **circle_workflows}

# Save to root location
with open(root_path, 'w') as f:
    json.dump(merged, f, indent=2)

print(f"Merged {len(circle_workflows)} workflows from circle/ into root")
print(f"Total workflows: {len(merged)}")

# Optionally remove the circle workflow file to avoid confusion
# os.remove(circle_path)
