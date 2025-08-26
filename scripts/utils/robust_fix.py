#!/usr/bin/env python3

import re

def fix_frontend_robust():
    file_path = "static/index.html"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    print("🔍 Analyzing current workflow handling blocks...")
    
    # Find all lines with workflow intent checks
    lines = content.split('\n')
    workflow_lines = []
    
    for i, line in enumerate(lines):
        if "data.intent === 'workflow'" in line:
            workflow_lines.append((i, line.strip()))
    
    print(f"📊 Found {len(workflow_lines)} workflow intent checks:")
    for line_num, line_content in workflow_lines:
        print(f"   Line {line_num + 1}: {line_content}")
    
    # Look for the context around each to identify the redundant one
    redundant_start = None
    redundant_end = None
    
    for line_num, line_content in workflow_lines:
        # Check if this is the redundant block by looking at surrounding context
        context_start = max(0, line_num - 5)
        context_end = min(len(lines), line_num + 15)
        context = '\n'.join(lines[context_start:context_end])
        
        if "This is a workflow command" in context and "addMessage(data.response ||" in context:
            print(f"🎯 Found redundant block starting around line {line_num + 1}")
            
            # Find the start of this block (the if statement)
            for i in range(line_num, max(0, line_num - 10), -1):
                if "if (data.intent === 'workflow')" in lines[i]:
                    redundant_start = i
                    break
            
            # Find the end of this block (the return statement)
            brace_count = 0
            for i in range(line_num, min(len(lines), line_num + 20)):
                if '{' in lines[i]:
                    brace_count += lines[i].count('{')
                if '}' in lines[i]:
                    brace_count -= lines[i].count('}')
                if 'return;' in lines[i] and brace_count <= 0:
                    redundant_end = i + 1  # Include the return line
                    break
            break
    
    if redundant_start is None or redundant_end is None:
        print("❌ Could not identify the redundant block boundaries")
        return False
    
    print(f"🗑️  Removing lines {redundant_start + 1} to {redundant_end}")
    
    # Remove the redundant block
    new_lines = lines[:redundant_start] + lines[redundant_end:]
    new_content = '\n'.join(new_lines)
    
    # Verify we kept the good block
    if "data.intent === 'workflow' || data.intent === 'simple_proof_action'" not in new_content:
        print("❌ Error: The good block was removed! Aborting.")
        return False
    
    # Count remaining workflow checks
    remaining_count = len(re.findall(r"data\.intent === 'workflow'", new_content))
    print(f"✅ Success! Reduced from 2 to {remaining_count} workflow checks")
    
    # Write the fixed file
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    return True

if __name__ == "__main__":
    print("🔧 Robust frontend fix...")
    success = fix_frontend_robust()
    
    if success:
        print("\n🎉 Frontend fixed successfully!")
    else:
        print("\n💡 Manual fix needed - see instructions below")

