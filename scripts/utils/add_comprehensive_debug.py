# Read the file
with open('langchain_service.py', 'r') as f:
    lines = f.readlines()

# Find execute_workflow function
in_execute_workflow = False
modified = False

for i, line in enumerate(lines):
    if 'async def execute_workflow(request: WorkflowRequest):' in line:
        in_execute_workflow = True
    elif in_execute_workflow and line.strip() == 'try:':
        # Add debug after try:
        indent = '        '  # 8 spaces
        lines.insert(i + 1, f'{indent}print("\\n" + "="*60)\\n')
        lines.insert(i + 2, f'{indent}print(f"[DEBUG] execute_workflow called at {{datetime.now().isoformat()}}")\\n')
        lines.insert(i + 3, f'{indent}print(f"[DEBUG] Command: {{request.command}}")\\n')
        lines.insert(i + 4, f'{indent}print("="*60)\\n')
        modified = True
        break

if modified:
    with open('langchain_service.py', 'w') as f:
        f.writelines(lines)
    print("Debug logging added to execute_workflow")
else:
    print("Could not find the right place to add debug")
