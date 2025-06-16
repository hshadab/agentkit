import re

# Read the HTML file
with open('static/index.html', 'r') as f:
    content = f.read()

# Common syntax issues in template literals
# Fix any onclick handlers that might have quote issues
content = re.sub(r'onclick="sendExample\(([^"]+)"\)', r'onclick="sendExample(\1)"', content)

# Look for the specific Advanced Examples section that might have syntax errors
# The issue is likely in the onclick handlers with nested quotes

# Find all onclick="sendExample(...)" patterns and fix quote escaping
def fix_onclick(match):
    onclick_content = match.group(1)
    # If the content has single quotes inside, we need to escape them
    onclick_content = onclick_content.replace("'", "\\'")
    return f'onclick="sendExample(\'{onclick_content}\')"'

# Fix all sendExample calls
content = re.sub(r'onclick="sendExample\(\'([^\']+)\'\)"', fix_onclick, content)

# Write back
with open('static/index.html', 'w') as f:
    f.write(content)

print("✅ Fixed syntax issues!")
print("🔄 Please refresh your browser")
