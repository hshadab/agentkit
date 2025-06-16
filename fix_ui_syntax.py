# Read the current HTML
with open('static/index.html', 'r') as f:
    lines = f.readlines()

# Fix lines with problematic quotes in onclick handlers
fixed_lines = []
for line in lines:
    if 'onclick="sendExample(' in line and "'" in line:
        # Extract the content between sendExample(' and ')
        import re
        match = re.search(r"onclick=\"sendExample\('([^']+)'\)\"", line)
        if match:
            message = match.group(1)
            # Escape any internal quotes
            message = message.replace("'", "\\'")
            line = re.sub(
                r"onclick=\"sendExample\('[^']+'\)\"",
                f'onclick="sendExample(\'{message}\')"',
                line
            )
    fixed_lines.append(line)

# Write back
with open('static/index.html', 'w') as f:
    f.writelines(fixed_lines)

print("✅ Syntax fixed!")
