import json
import subprocess
import os

print("=== Workflow Diagnostics ===\n")

# 1. Check workflow history
if os.path.exists("workflow_history.json"):
    with open("workflow_history.json", 'r') as f:
        history = json.load(f)
    
    # Count workflows by status
    status_count = {}
    for wf_id, wf_data in history.items():
        status = wf_data.get('status', 'unknown')
        status_count[status] = status_count.get(status, 0) + 1
    
    print(f"Workflow Status Summary:")
    for status, count in status_count.items():
        print(f"  {status}: {count}")
    
    # Find latest created workflow
    created_workflows = [(k, v) for k, v in history.items() if v.get('status') == 'created']
    if created_workflows:
        created_workflows.sort(key=lambda x: x[1].get('createdAt', ''), reverse=True)
        latest = created_workflows[0]
        print(f"\nLatest stuck workflow:")
        print(f"  ID: {latest[0]}")
        print(f"  Description: {latest[1].get('description')}")
        print(f"  Steps: {json.dumps(latest[1].get('steps', []), indent=2)}")

# 2. Test workflow parser
print("\n=== Testing Workflow Parser ===")
test_commands = [
    "Generate location proof for NYC then if location verified send 1 USDC to alice",
    "Test ETH to SOL transfer sequence"
]

for cmd in test_commands:
    print(f"\nTesting: {cmd}")
    result = subprocess.run(
        f'node circle/workflowParser_generic_final.js "{cmd}"',
        shell=True,
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        lines = result.stdout.split('\n')
        json_start = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('{'):
                json_start = i
                break
        
        if json_start >= 0:
            try:
                json_str = '\n'.join(lines[json_start:])
                parsed = json.loads(json_str)
                print(f"  ✓ Parsed successfully: {len(parsed.get('steps', []))} steps")
            except:
                print(f"  ✗ Failed to parse JSON")
        else:
            print(f"  ✗ No JSON found in output")
    else:
        print(f"  ✗ Parser failed with code {result.returncode}")

print("\n=== Checking File Permissions ===")
files_to_check = [
    "circle/workflowCLI_generic.js",
    "circle/workflowParser_generic_final.js",
    "circle/workflowManager.js"
]

for file in files_to_check:
    if os.path.exists(file):
        stats = os.stat(file)
        print(f"{file}: {'✓ executable' if stats.st_mode & 0o111 else '✗ not executable'}")
    else:
        print(f"{file}: ✗ not found")
