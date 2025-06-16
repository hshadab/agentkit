# Read the current file
with open('static/index.html', 'r') as f:
    lines = f.readlines()

# Find and remove the Advanced Examples section
new_lines = []
skip = False
for line in lines:
    if '🌍 Advanced Examples' in line:
        skip = True
    elif skip and '</div>' in line and 'example-category' in line:
        skip = False
        continue
    elif not skip:
        new_lines.append(line)

# Write the fixed version
with open('static/index.html', 'w') as f:
    f.writelines(new_lines)

print("Removed problematic section!")
