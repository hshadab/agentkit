import re

# Read the current file
with open('langchain_service.py', 'r') as f:
    content = f.read()

# The debug code to insert
debug_code = '''        print(f"\\n{'='*60}")
        print(f"[DEBUG] Execute workflow endpoint called")
        print(f"[DEBUG] Command: {request.command}")
        print(f"{'='*60}")
        
        # First create the workflow
        create_result = await create_workflow(request)
        
        print(f"[DEBUG] Create workflow result: success={create_result.get('success')}, workflowId={create_result.get('workflowId')}")
        
        if not create_result.get("success"):
            print(f"[DEBUG] Workflow creation failed!")
            return create_result
        
        workflow_id = create_result["workflowId"]
        print(f"[DEBUG] Workflow ID: {workflow_id}")
        
        # Execute the workflow using the CLI
        cli_command = f"node circle/workflowCLI_generic.js '{request.command}'"
        
        print(f"[DEBUG] About to execute CLI")
        print(f"[DEBUG] CLI command: {cli_command}")
        print(f"[DEBUG] Working directory: {os.path.expanduser('~/agentkit')}")
        
        # Check if CLI exists
        cli_path = os.path.expanduser("~/agentkit/circle/workflowCLI_generic.js")
        print(f"[DEBUG] CLI path exists: {os.path.exists(cli_path)}")
        
        # Set environment variables for testing if needed
        env = os.environ.copy()
        
        print(f"[DEBUG] Running subprocess...")
        
        result = subprocess.run(
            cli_command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=os.path.expanduser("~/agentkit"),
            env=env
        )
        
        print(f"[DEBUG] Subprocess completed")
        print(f"[DEBUG] Return code: {result.returncode}")
        print(f"[DEBUG] Stdout ({len(result.stdout)} chars):")
        print(f"[DEBUG] --- STDOUT START ---")
        print(result.stdout)
        print(f"[DEBUG] --- STDOUT END ---")
        if result.stderr:
            print(f"[DEBUG] Stderr: {result.stderr}")
        print(f"{'='*60}\\n")'''

# Find execute_workflow function and replace the beginning
pattern = r'(@app\.post\("/execute_workflow"\)\s*async def execute_workflow\(request: WorkflowRequest\):\s*""".*?"""\s*try:\s*)(.*?)(# First create the workflow.*?result = subprocess\.run\(.*?\)\s*)'

# Check if we can find the pattern
if re.search(pattern, content, re.DOTALL):
    # Replace with debug version
    new_content = re.sub(
        pattern,
        r'\1' + debug_code + '\n        ',
        content,
        flags=re.DOTALL
    )
    
    # Backup original
    with open('langchain_service.py.backup_debug2', 'w') as f:
        f.write(content)
    
    # Write updated
    with open('langchain_service.py', 'w') as f:
        f.write(new_content)
    
    print("Debug logging added successfully!")
    print("Backup saved as langchain_service.py.backup_debug2")
else:
    print("Could not find execute_workflow function pattern")
    print("Please add debug logging manually")
