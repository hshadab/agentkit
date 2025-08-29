#!/usr/bin/env python3
import re
import sys

def fix_concat_operations(content):
    """Replace all .concat() operations with template literals or string concatenation"""
    
    # Pattern 1: Simple concat with single argument
    # 'string'.concat(value) -> `string${value}`
    pattern1 = r"'([^']*)'\s*\.concat\(([^)]+)\)"
    content = re.sub(pattern1, lambda m: f'`{m.group(1)}${{{m.group(2)}}}`', content)
    
    # Pattern 2: Double quotes version
    # "string".concat(value) -> `string${value}`
    pattern2 = r'"([^"]*)"\s*\.concat\(([^)]+)\)'
    content = re.sub(pattern2, lambda m: f'`{m.group(1)}${{{m.group(2)}}}`', content)
    
    # Pattern 3: Variable concat
    # variable.concat(value) -> `${variable}${value}`
    pattern3 = r'(\w+)\.concat\(([^)]+)\)'
    def replace_var_concat(match):
        var = match.group(1)
        val = match.group(2)
        # Skip if it's a string literal
        if var in ['debug', 'console', 'window', 'document']:
            return match.group(0)
        return f'`${{{var}}}${{{val}}}`'
    
    # Pattern 4: Chained concat - need to handle carefully
    # We'll convert chained concats to template literals
    
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Skip lines that are already template literals
        if '`' in line and '.concat(' in line:
            # This might be inside a template literal, skip
            fixed_lines.append(line)
            continue
            
        # Fix debug statements specifically
        if 'debug(' in line and '.concat(' in line:
            # Extract the debug content
            match = re.search(r"debug\('([^']*)'\.concat\((.*?)\)\)", line)
            if match:
                prefix = match.group(1)
                rest = match.group(2)
                # Handle multiple concat chains
                if '.concat(' in rest:
                    parts = []
                    parts.append(prefix)
                    # Parse the chain
                    remaining = rest
                    while '.concat(' in remaining:
                        # Find the next concat
                        concat_match = re.search(r"([^)]+)\)\.concat\((.*)", remaining)
                        if concat_match:
                            parts.append(concat_match.group(1))
                            remaining = concat_match.group(2)
                        else:
                            parts.append(remaining.rstrip(')'))
                            break
                    else:
                        parts.append(remaining.rstrip(')'))
                    
                    # Build template literal
                    template = 'debug(`'
                    for i, part in enumerate(parts):
                        if i == 0:
                            template += part
                        else:
                            # Clean up the part
                            part = part.strip().strip("'").strip('"')
                            if part.startswith('(') and part.endswith(')'):
                                part = part[1:-1]
                            template += f'${{{part}}}'
                    template += '`);'
                    line = line[:line.index('debug(')] + template
                else:
                    # Single concat
                    line = re.sub(
                        r"debug\('([^']*)'\.concat\(([^)]+)\)\)",
                        r"debug(`\1${\2}`)",
                        line
                    )
        
        # Fix other concat operations
        elif '.concat(' in line:
            # Handle various patterns
            
            # Pattern: 'string'.concat(var)
            line = re.sub(r"'([^']*)'\s*\.concat\(([^)]+)\)", r"`\1${\2}`", line)
            
            # Pattern: "string".concat(var)  
            line = re.sub(r'"([^"]*)"\s*\.concat\(([^)]+)\)', r"`\1${\2}`", line)
            
            # Pattern: variable.concat('string')
            line = re.sub(r"(\w+)\.concat\('([^']*)'\)", r"`${{\1}}\2`", line)
            line = re.sub(r'(\w+)\.concat\("([^"]*)"\)', r"`${{\1}}\2`", line)
            
            # Pattern: variable.concat(variable)
            line = re.sub(r"(\w+)\.concat\((\w+)\)", r"`${{\1}}${{\2}}`", line)
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

# Read the file
with open('/home/hshadab/agentkit/static/index.html', 'r') as f:
    content = f.read()

# Fix concat operations
fixed_content = fix_concat_operations(content)

# Write back
with open('/home/hshadab/agentkit/static/index.html', 'w') as f:
    f.write(fixed_content)

print("Fixed concat operations in index.html")

# Count remaining concat operations
import subprocess
result = subprocess.run(['grep', '-c', '.concat(', '/home/hshadab/agentkit/static/index.html'], 
                       capture_output=True, text=True)
remaining = result.stdout.strip()
print(f"Remaining concat operations: {remaining}")