import re

with open('langchain_service.py', 'r') as f:
    content = f.read()

# Find create_workflow function
pattern = r'(@app\.post\("/create_workflow"\)\s*async def create_workflow\(request: WorkflowRequest\):\s*""".*?""")'

match = re.search(pattern, content, re.DOTALL)
if match:
    # Find try block
    try_pos = content.find('try:', match.end())
    if try_pos != -1:
        newline_after_try = content.find('\n', try_pos)
        debug_code = '''
        print(f"\\n[DEBUG-CREATE] Creating workflow for: {request.command}")
'''
        new_content = content[:newline_after_try+1] + debug_code + content[newline_after_try+1:]
        
        # Add debug after parser execution
        parser_pos = new_content.find('result = subprocess.run(', try_pos)
        if parser_pos != -1:
            # Find closing parenthesis of subprocess.run
            pos = parser_pos + len('result = subprocess.run(')
            paren_count = 1
            while pos < len(new_content) and paren_count > 0:
                if new_content[pos] == '(':
                    paren_count += 1
                elif new_content[pos] == ')':
                    paren_count -= 1
                pos += 1
            
            newline_after = new_content.find('\n', pos)
            debug_code2 = '''
        print(f"[DEBUG-CREATE] Parser stdout: {result.stdout[:200]}")
        print(f"[DEBUG-CREATE] Parser stderr: {result.stderr}")
'''
            new_content = new_content[:newline_after+1] + debug_code2 + new_content[newline_after+1:]
        
        # Add debug after JSON parsing
        json_parse_pos = new_content.find('parsed_workflow = json.loads(json_str)', try_pos)
        if json_parse_pos != -1:
            newline_after = new_content.find('\n', json_parse_pos)
            debug_code3 = '''
                print(f"[DEBUG-CREATE] Parsed workflow: {parsed_workflow}")
'''
            new_content = new_content[:newline_after+1] + debug_code3 + new_content[newline_after+1:]
        
        with open('langchain_service.py', 'w') as f:
            f.write(new_content)
        
        print("Debug logging added to create_workflow")
else:
    print("Could not find create_workflow function")
