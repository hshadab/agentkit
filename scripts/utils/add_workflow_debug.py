import re

with open('/home/hshadab/agentkit/langchain_service.py', 'r') as f:
    content = f.read()

# Add debug output right after we parse the workflow
debug_code = '''
        print(f"[DEBUG] Raw CLI output: {result.stdout[:200]}...")
        
        # Debug: Show all lines with "wf_" in them
        for line in result.stdout.split('\\n'):
            if 'wf_' in line:
                print(f"[DEBUG] Found line with wf_: {line}")
'''

# Insert after "if result.returncode == 0:"
pattern = r'(print\(f"\[DEBUG\] CLI stdout first 500 chars:.*?\n)'
replacement = r'\1' + debug_code

content = re.sub(pattern, replacement, content)

with open('/home/hshadab/agentkit/langchain_service.py', 'w') as f:
    f.write(content)

print("Added debug logging")
