# Installation Instructions for Paste Function Fixes

## 1. Install wasm2wat (Required for proper WAT format output)

### On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install wabt
```

### On macOS:
```bash
brew install wabt
```

### On other systems:
Download from: https://github.com/WebAssembly/wabt/releases

## 2. Update langchain_service.py

Add the `generate_simple_wat` function from `compile_fix.py` to your langchain_service.py file.

Then update the `compile_to_wasm` function to use WAT format:

1. Find the `compile_to_wasm` function in langchain_service.py
2. After the clang compilation, add the wasm2wat conversion
3. Ensure the output is text format (WAT) not binary

## 3. Update the UI (static/index.html)

Add the contents of `paste_ui_fix.js` to your index.html file, replacing the existing paste handling code.

## 4. Update Rust backend (src/main.rs)

Add better custom proof handling by updating the `process_nl_command` function to properly parse custom proof commands.

## 5. Test the fixes

1. Click the 📋 paste button
2. Try one of the example codes (Fibonacci, Square, Factorial)
3. Notice the auto-populated arguments
4. Click "Process Code"
5. The proof should generate successfully

## Common Issues and Solutions:

### "invalid utf-8 sequence" error
- The file is binary WASM instead of text WAT
- Make sure wasm2wat is installed
- Check that the compile function outputs WAT format

### "No arguments provided" error
- The UI now requires arguments
- Default values are suggested based on the code
- Always provide at least one argument

### "Compilation failed" error
- Check that the C code has proper syntax
- Ensure main() function exists
- Use int32_t instead of int
- Remove printf/scanf statements
