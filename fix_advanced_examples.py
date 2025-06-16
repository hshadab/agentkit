with open('static/index.html', 'r') as f:
    content = f.read()

# Find and replace the Advanced Examples section with properly escaped quotes
old_section = '''        <div class="example-category">
            <h4>🌍 Advanced Examples</h4>
            <div class="example-item" onclick="sendExample('give me a proof of fibonacci 5 and explain it in spanish')">
                Proof + Spanish explanation
            </div>
            <div class="example-item" onclick="sendExample('verify the last proof and connect it to market trends in verifiable compute')">
                Verify + Market analysis
            </div>
            <div class="example-item" onclick="sendExample('prove factorial of 7 and explain the mathematical significance')">
                Proof + Math insights
            </div>
        </div>'''

new_section = '''        <div class="example-category">
            <h4>🌍 Advanced Examples</h4>
            <div class="example-item" onclick='sendExample("give me a proof of fibonacci 5 and explain it in spanish")'>
                Proof + Spanish explanation
            </div>
            <div class="example-item" onclick='sendExample("verify the last proof and connect it to market trends in verifiable compute")'>
                Verify + Market analysis
            </div>
            <div class="example-item" onclick='sendExample("prove factorial of 7 and explain the mathematical significance")'>
                Proof + Math insights
            </div>
        </div>'''

content = content.replace(old_section, new_section)

with open('static/index.html', 'w') as f:
    f.write(content)

print("Fixed!")
