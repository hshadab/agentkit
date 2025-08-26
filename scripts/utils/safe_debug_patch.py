import re

with open('langchain_service.py', 'r') as f:
    content = f.read()

# Replace the execute_workflow function with a properly debugged version
# Find the function
start_pattern = r'@app\.post\("/execute_workflow"\)\s*async def execute_workflow\(request: WorkflowRequest\):'
match = re.search(start_pattern, content)

if match:
    # Find the end of the function (next @app.post or end of file)
    next_endpoint = re.search(r'\n@app\.(post|get)', content[match.end():])
    if next_endpoint:
        func_end = match.end() + next_endpoint.start()
    else:
        func_end = len(content)
    
    # Extract the function
    func_content = content[match.start():func_end]
    
    # Add debug statements after the try:
    new_func = re.sub(
        r'(\s+try:\s*\n)',
        r'\1        print(f"\\n[DEBUG] Execute workflow called: {request.command}")\n',
        func_content
    )
    
    # Add debug after create_workflow
    new_func = re.sub(
        r'(create_result = await create_workflow\(request\)\s*\n)',
        r'\1        print(f"[DEBUG] Create result: {create_result}")\n',
        new_func
    )
    
    # Add debug after cli_command
    new_func = re.sub(
        r'(cli_command = f"node circle/workflowCLI_generic\.js.*?\n)',
        r'\1        print(f"[DEBUG] CLI command: {cli_command}")\n',
        new_func
    )
    
    # Add debug after subprocess.run
    new_func = re.sub(
        r'(result = subprocess\.run\([^)]+\)\s*\n)',
        r'\1        print(f"[DEBUG] Return code: {result.returncode}")\n        print(f"[DEBUG] Stdout: {result.stdout[:500]}")\n        if result.stderr:\n            print(f"[DEBUG] Stderr: {result.stderr}")\n',
        new_func,
        flags=re.DOTALL
    )
    
    # Replace in original content
    new_content = content[:match.start()] + new_func + content[func_end:]
    
    # Save backup and write
    with open('langchain_service.py.debug_backup', 'w') as f:
        f.write(content)
    
    with open('langchain_service.py', 'w') as f:
        f.write(new_content)
    
    print("Debug logging added safely")
else:
    print("Could not find execute_workflow function")
