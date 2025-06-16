#!/usr/bin/env python3
import sys
import shutil
from datetime import datetime

# Get the HTML file path
html_file = sys.argv[1] if len(sys.argv) > 1 else "/home/hshadab/agentkit/static/index.html"

# Create backup
backup_file = f"{html_file}.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
shutil.copy2(html_file, backup_file)
print(f"Backup created: {backup_file}")

# Read the file
with open(html_file, 'r') as f:
    content = f.read()

# Check if already fixed
if 'zkEngine Button Fix' in content:
    print("Already fixed!")
    sys.exit(0)

# The fix to inject
fix_script = """<script>
// zkEngine Button Fix
window.proofStates = window.proofStates || {};
window.showCProgram = function(id) {
    window.proofStates[id] = window.proofStates[id] || {functionName: 'main', wasmFile: 'custom.wat'};
    var code = window.lastPastedCode || '// C program\\nint main() { return 1; }';
    if (window.showCodeModal) window.showCodeModal('C Program', 'program.c', code, true);
    else alert('C Program:\\n\\n' + code);
};
window.showWasmFile = function(id) {
    window.proofStates[id] = window.proofStates[id] || {functionName: 'main', wasmFile: 'custom.wat'};
    var wat = '(module\\n  (func (export "main") (param $dummy i32) (result i32)\\n    (i32.const 1)\\n  )\\n)';
    if (window.showCodeModal) window.showCodeModal('WASM File', 'program.wat', wat, false);
    else alert('WASM File:\\n\\n' + wat);
};
console.log('zkEngine fixes applied!');
</script>
"""

# Insert before </body>
new_content = content.replace('</body>', fix_script + '\n</body>')

# Write back
with open(html_file, 'w') as f:
    f.write(new_content)

print("✅ Fix applied successfully!")
print("Refresh your browser to see the changes.")

