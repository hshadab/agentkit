#!/usr/bin/env python3
from html.parser import HTMLParser

class HTMLValidator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
        
    def error(self, message):
        self.errors.append(message)

# Read and validate the HTML
with open('static/index.html', 'r') as f:
    html_content = f.read()

validator = HTMLValidator()
try:
    validator.feed(html_content)
    if validator.errors:
        print("HTML validation errors found:")
        for error in validator.errors:
            print(f"  - {error}")
    else:
        print("✅ HTML syntax is valid!")
except Exception as e:
    print(f"❌ HTML parsing error: {e}")