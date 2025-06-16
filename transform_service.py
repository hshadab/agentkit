from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re
import subprocess
import tempfile
import os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def transform_for_zkengine(code):
    changes = []
    
    # Add stdint.h
    if '#include <stdint.h>' not in code:
        code = '#include <stdint.h>\n\n' + code
        changes.append("Added stdint.h")
    
    # Replace types
    code = re.sub(r'\bint\s+', 'int32_t ', code)
    code = re.sub(r'\bfloat\s+', 'int32_t ', code)
    
    # Remove I/O
    code = re.sub(r'printf\s*\([^;]+\);', '/* printf removed */;', code)
    
    # Fix main
    code = re.sub(r'int\s+main\s*\(\s*\)', 'int32_t main(int32_t input)', code)
    
    if any(x in code for x in ['int32_t', 'removed']):
        changes.append("Fixed types and I/O")
    
    return code, changes

@app.post("/api/transform-code")
async def transform_code(request: dict):
    transformed, changes = transform_for_zkengine(request['code'])
    return {"success": True, "transformed_code": transformed, "changes": changes}

@app.post("/api/compile-transformed")
async def compile_transformed(request: dict):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
        f.write(request['code'])
        c_file = f.name
    
    wasm_file = c_file.replace('.c', '.wasm')
    wat_file = c_file.replace('.c', '.wat')
    
    result = subprocess.run(['clang', '--target=wasm32', '-nostdlib', '-Wl,--no-entry', '-Wl,--export-all', '-O3', '-o', wasm_file, c_file], capture_output=True, text=True, timeout=10)
    
    if result.returncode == 0:
        subprocess.run(['wasm2wat', wasm_file, '-o', wat_file], capture_output=True)
        with open(wat_file, 'r') as f:
            wat_content = f.read()
        
        filename = f"custom_{os.urandom(4).hex()}"
        os.rename(wat_file, f"zkengine/example_wasms/{filename}.wat")
        
        return {"success": True, "wat_content": wat_content, "wasm_file": f"{filename}.wat"}
    
    return {"success": False, "error": result.stderr}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
