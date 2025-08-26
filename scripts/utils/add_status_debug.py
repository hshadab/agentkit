import re

with open('/home/hshadab/agentkit/langchain_service.py', 'r') as f:
    content = f.read()

# Find the workflow_status function
status_func = content.find('@app.post("/workflow_status")')
if status_func > 0:
    # Add debug print at the beginning
    insert_point = content.find('try:', status_func)
    if insert_point > 0:
        debug_code = '''try:
        print(f"[DEBUG] workflow_status called for: {request.workflowId}")
        '''
        content = content[:insert_point] + debug_code + content[insert_point+4:]
        
        # Also add debug for what we return
        return_point = content.find('return {', status_func)
        if return_point > 0:
            debug_return = '''print(f"[DEBUG] Returning status: {workflow_data.get('status', 'unknown')} for {request.workflowId}")
            return {'''
            content = content[:return_point] + debug_return + content[return_point+8:]

with open('/home/hshadab/agentkit/langchain_service.py', 'w') as f:
    f.write(content)

print("Added debug logging to workflow_status")
