with open('static/index.html', 'r') as f:
    content = f.read()

# Add functions at the end of the script section, before the closing </script>
functions_to_add = '''
        // Special example functions to avoid quote issues
        function exampleSpanish() {
            sendExample('give me a proof of fibonacci 5 and explain it in spanish');
        }
        
        function exampleMarket() {
            sendExample('verify the last proof and connect it to market trends in verifiable compute');
        }
        
        function exampleMath() {
            sendExample('prove factorial of 7 and explain the mathematical significance');
        }
'''

# Insert before the final </script>
content = content.replace('        // Connect on load\n        connect();\n    </script>', 
                          f'        // Connect on load\n        connect();\n        \n{functions_to_add}    </script>')

# Replace the problematic onclick handlers
content = content.replace(
    '''onclick="sendExample('give me a proof of fibonacci 5 and explain it in spanish')"''',
    '''onclick="exampleSpanish()"'''
)
content = content.replace(
    '''onclick="sendExample('verify the last proof and connect it to market trends in verifiable compute')"''',
    '''onclick="exampleMarket()"'''
)
content = content.replace(
    '''onclick="sendExample('prove factorial of 7 and explain the mathematical significance')"''',
    '''onclick="exampleMath()"'''
)

with open('static/index.html', 'w') as f:
    f.write(content)

print("Fixed with proper functions!")
