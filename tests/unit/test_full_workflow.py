import subprocess
import json
import time

print("=== Testing Full Workflow Flow ===\n")

# 1. Parse the command
command = "Generate location proof for NYC then if location verified send 1 USDC to alice"
print(f"1. Testing parser with: {command}")

parser_result = subprocess.run(
    f'node circle/workflowParser_generic_final.js "{command}"',
    shell=True,
    capture_output=True,
    text=True
)

# Extract JSON from parser output
lines = parser_result.stdout.split('\n')
json_str = None
for i, line in enumerate(lines):
    if line.strip().startswith('{'):
        json_str = '\n'.join(lines[i:])
        break

if json_str:
    parsed = json.loads(json_str)
    print(f"   ✓ Parsed: {len(parsed['steps'])} steps")
    
    # 2. Create workflow
    workflow_id = f"test_{int(time.time())}"
    print(f"\n2. Creating workflow with ID: {workflow_id}")
    
    create_cmd = f"""node circle/workflowManager.js create {workflow_id} '{command}' '{json.dumps(parsed)}'"""
    create_result = subprocess.run(create_cmd, shell=True, capture_output=True, text=True)
    
    if create_result.returncode == 0:
        print("   ✓ Workflow created")
        
        # 3. Execute workflow
        print(f"\n3. Executing workflow")
        exec_cmd = f'node circle/workflowCLI_generic.js "{command}"'
        exec_result = subprocess.run(exec_cmd, shell=True, capture_output=True, text=True)
        
        if exec_result.returncode == 0:
            print("   ✓ Workflow executed successfully")
            print(f"   Output preview: {exec_result.stdout[:200]}...")
        else:
            print(f"   ✗ Execution failed: {exec_result.stderr}")
    else:
        print(f"   ✗ Create failed: {create_result.stderr}")
else:
    print("   ✗ Parser failed to produce JSON")
