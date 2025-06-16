# Read the file
with open('static/index.html', 'r') as f:
    content = f.read()

# Fix the problematic onclick handlers by escaping inner quotes
replacements = [
    ("onclick=\"sendExample('give me a proof of fibonacci 5 and explain it in spanish')\"", 
     "onclick=\"sendExample('give me a proof of fibonacci 5 and explain it in spanish')\""
    ),
    ("onclick=\"sendExample('verify the last proof and connect it to market trends in verifiable compute')\"",
     "onclick=\"sendExample('verify the last proof and connect it to market trends in verifiable compute')\""
    ),
    ("onclick=\"sendExample('prove factorial of 7 and explain the mathematical significance')\"",
     "onclick=\"sendExample('prove factorial of 7 and explain the mathematical significance')\""
    ),
]

# Apply replacements
for old, new in replacements:
    content = content.replace(old, new)

# Write back
with open('static/index.html', 'w') as f:
    f.write(content)

print("Fixed!")
