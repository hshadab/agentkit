#!/usr/bin/env python3
import re

# Read the file
with open('/home/hshadab/agentkit/static/index.html', 'r') as f:
    lines = f.readlines()

fixed_lines = []
for line_num, line in enumerate(lines):
    original_line = line
    
    # Skip commented lines
    if line.strip().startswith('//'):
        fixed_lines.append(line)
        continue
    
    # Fix broken template literals first
    line = re.sub(r'\$\{([^}]+)\}`\)\.concat\(', r'${\1}', line)
    line = re.sub(r'\}`\.concat\(', '', line)
    line = re.sub(r'}\`\.concat\(', '}', line)
    
    # Fix .concat() patterns
    if '.concat(' in line:
        # Pattern 1: String literal concat
        line = re.sub(r"'([^']*)'\s*\.concat\('([^']*)'\)", r"'\1\2'", line)
        line = re.sub(r'"([^"]*)"\s*\.concat\("([^"]*)"\)', r'"\1\2"', line)
        
        # Pattern 2: String concat with variable
        line = re.sub(r"'([^']*)'\s*\.concat\(([^)]+)\)", lambda m: f"`{m.group(1)}${{{m.group(2)}}}`", line)
        line = re.sub(r'"([^"]*)"\s*\.concat\(([^)]+)\)', lambda m: f"`{m.group(1)}${{{m.group(2)}}}`", line)
        
        # Pattern 3: Variable concat with string
        line = re.sub(r"(\w+)\.concat\('([^']*)'\)", lambda m: f"`${{{m.group(1)}}}{m.group(2)}`", line)
        line = re.sub(r'(\w+)\.concat\("([^"]*)"\)', lambda m: f"`${{{m.group(1)}}}{m.group(2)}`", line)
        
        # Pattern 4: Variable concat with variable
        line = re.sub(r"(\w+)\.concat\(([^')][^)]*)\)", lambda m: f"`${{{m.group(1)}}}${{{m.group(2)}}}`", line)
        
        # Pattern 5: Fix template literal concats
        line = re.sub(r"`([^`]*)`\.concat\('([^']*)'\)", r"`\1\2`", line)
        line = re.sub(r'`([^`]*)`\.concat\("([^"]*)"\)', r'`\1\2`', line)
        line = re.sub(r"`([^`]*)`\.concat\(([^)]+)\)", lambda m: f"`{m.group(1)}${{{m.group(2)}}}`", line)
        
        # Pattern 6: Fix multi-line C code concats
        if 'cCode = ' in line and '.concat(' in line:
            # Replace the entire C code block with template literal
            line = line.replace("').concat(", "")
            line = line.replace('").concat(', "")
            line = line.replace("').concat('", "")
            line = line.replace('").concat("', "")
    
    # Fix specific broken patterns
    line = line.replace("${Date.now(}`.toString())", "${Date.now()}")
    line = line.replace("${event.code.toString(}`)", "${event.code}")
    line = line.replace("${maxPolls.toString(}`)", "${maxPolls}")
    line = line.replace("int main(}` {", "int main() {")
    line = line.replace("int main(int input}` {", "int main(int input) {")
    line = line.replace("#include <stdint.h>\\n\\n'}`", "#include <stdint.h>\\n\\n")
    
    fixed_lines.append(line)

# Write back the fixed content
with open('/home/hshadab/agentkit/static/index.html', 'w') as f:
    f.writelines(fixed_lines)

# Count remaining concat operations
import subprocess
result = subprocess.run(['grep', '-c', '.concat(', '/home/hshadab/agentkit/static/index.html'], 
                       capture_output=True, text=True)
remaining = result.stdout.strip() if result.returncode == 0 else "0"
print(f"Fixed concat operations. Remaining: {remaining}")