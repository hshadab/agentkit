import re

# Read the file
with open('langchain_service.py', 'r') as f:
    content = f.read()

# Find the execute_workflow function
pattern = r'(@app\.post\("/execute_workflow"\)\s*async def execute_workflow\(request: WorkflowRequest\):\s*""".*?""")'

# Find where the function starts
match = re.search(pattern, content, re.DOTALL)
if match:
    # Find the position after the docstring
    end_pos = match.end()
    
    # Find the try: block
    try_pos = content.find('try:', end_pos)
    
    if try_pos != -1:
        # Insert debug code after try:
        indent = '        '  # 8 spaces for indentation
        debug_code = f'''
{indent}print(f"\\n{'='*60}")
{indent}print(f"[DEBUG] Execute workflow endpoint called")
{indent}print(f"[DEBUG] Command: {{request.command}}")
{indent}print(f"[DEBUG] Time: {{datetime.now().isoformat()}}")
{indent}print(f"{'='*60}")
'''
        
        # Find the line after try:
        newline_after_try = content.find('\n', try_pos)
        
        # Insert the debug code
        new_content = content[:newline_after_try+1] + debug_code + content[newline_after_try+1:]
        
        # Now find other key points to add debug
        # After create_workflow
        create_pos = new_content.find('create_result = await create_workflow(request)', try_pos)
        if create_pos != -1:
            newline_after = new_content.find('\n', create_pos)
            debug_code2 = f'''
{indent}print(f"[DEBUG] Create result: {{create_result}}")
'''
            new_content = new_content[:newline_after+1] + debug_code2 + new_content[newline_after+1:]
        
        # After cli_command assignment
        cli_pos = new_content.find('cli_command = f"node circle/workflowCLI_generic.js', try_pos)
        if cli_pos != -1:
            newline_after = new_content.find('\n', cli_pos)
            debug_code3 = f'''
{indent}print(f"[DEBUG] CLI command: {{cli_command}}")
{indent}cli_path = os.path.expanduser("~/agentkit/circle/workflowCLI_generic.js")
{indent}print(f"[DEBUG] CLI exists: {{os.path.exists(cli_path)}}")
'''
            new_content = new_content[:newline_after+1] + debug_code3 + new_content[newline_after+1:]
        
        # Before subprocess.run
        subprocess_pos = new_content.find('result = subprocess.run(', try_pos)
        if subprocess_pos != -1:
            # Go back to start of line
            line_start = new_content.rfind('\n', 0, subprocess_pos) + 1
            debug_code4 = f'{indent}print(f"[DEBUG] About to run subprocess...")\n'
            new_content = new_content[:line_start] + debug_code4 + new_content[line_start:]
        
        # After subprocess.run - find the closing parenthesis
        if subprocess_pos != -1:
            # Find the matching closing parenthesis
            paren_count = 0
            pos = new_content.find('subprocess.run(', subprocess_pos)
            pos += len('subprocess.run(')
            while pos < len(new_content):
                if new_content[pos] == '(':
                    paren_count += 1
                elif new_content[pos] == ')':
                    if paren_count == 0:
                        # Found the closing parenthesis
                        newline_after = new_content.find('\n', pos)
                        debug_code5 = f'''
{indent}print(f"[DEBUG] Subprocess completed")
{indent}print(f"[DEBUG] Return code: {{result.returncode}}")
{indent}print(f"[DEBUG] Stdout length: {{len(result.stdout)}}")
{indent}print(f"[DEBUG] First 500 chars of stdout:")
{indent}print(result.stdout[:500])
{indent}if result.stderr:
{indent}    print(f"[DEBUG] Stderr: {{result.stderr}}")
'''
                        new_content = new_content[:newline_after+1] + debug_code5 + new_content[newline_after+1:]
                        break
                    else:
                        paren_count -= 1
                pos += 1
        
        # Save backup and write new file
        with open('langchain_service.py.backup_fulldebug', 'w') as f:
            f.write(content)
        
        with open('langchain_service.py', 'w') as f:
            f.write(new_content)
        
        print("Full debug logging added successfully!")
        print("Backup saved as langchain_service.py.backup_fulldebug")
    else:
        print("Could not find try: block")
else:
    print("Could not find execute_workflow function")
