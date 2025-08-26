#!/usr/bin/env python3

def fix_frontend_simple():
    file_path = "static/index.html"
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    print("🎯 Removing the first workflow intent check (line 509)...")
    print("🎯 Keeping the unified one (line 568)")
    
    # Find the first occurrence and remove that block
    first_workflow_line = None
    for i, line in enumerate(lines):
        if "if (data.intent === 'workflow') {" in line and "simple_proof_action" not in line:
            first_workflow_line = i
            break
    
    if first_workflow_line is None:
        print("❌ Could not find the first workflow block")
        return False
    
    print(f"📍 Found first workflow block at line {first_workflow_line + 1}")
    
    # Remove that entire if block (find the matching closing brace and return)
    remove_start = first_workflow_line
    remove_end = None
    brace_count = 0
    
    for i in range(first_workflow_line, len(lines)):
        line = lines[i]
        if '{' in line:
            brace_count += line.count('{')
        if '}' in line:
            brace_count -= line.count('}')
        if 'return;' in line and brace_count <= 0:
            remove_end = i + 1
            break
    
    if remove_end is None:
        print("❌ Could not find the end of the block")
        return False
    
    print(f"🗑️  Removing lines {remove_start + 1} to {remove_end}")
    print("   Block content:")
    for i in range(remove_start, remove_end):
        print(f"     {i + 1}: {lines[i].rstrip()}")
    
    # Remove the lines
    new_lines = lines[:remove_start] + lines[remove_end:]
    
    # Verify the good block is still there
    content = ''.join(new_lines)
    if "data.intent === 'workflow' || data.intent === 'simple_proof_action'" not in content:
        print("❌ Error: Removed the wrong block!")
        return False
    
    # Write the file
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    
    print("✅ Successfully removed the redundant block!")
    return True

if __name__ == "__main__":
    success = fix_frontend_simple()
    if success:
        print("\n🎉 Frontend fixed! Verifying...")
        import subprocess
        result = subprocess.run(['grep', '-c', 'data.intent === \'workflow\'', 'static/index.html'], 
                              capture_output=True, text=True)
        print(f"Remaining workflow checks: {result.stdout.strip()}")
