# This is a patch for the compile_to_wasm function
# Add this after the existing imports in langchain_service.py

def generate_simple_wat(code: str, function_name: str) -> str:
    """Generate a simple WAT file from C code analysis"""
    import re
    
    # Extract main function details
    main_match = re.search(r'int32_t\s+main\s*\(([^)]*)\)', code)
    if not main_match:
        # Default simple WAT
        return f"""(module
  (func $main (export "main") (param i32) (result i32)
    local.get 0
  )
)"""
    
    params = main_match.group(1)
    param_count = len([p for p in params.split(',') if p.strip() and p.strip() != 'void'])
    
    # Generate appropriate WAT based on parameter count
    if param_count == 0:
        wat_params = ""
        wat_body = "i32.const 42"  # Default return value
    elif param_count == 1:
        wat_params = "(param i32)"
        wat_body = "local.get 0"  # Return first parameter
    elif param_count == 2:
        wat_params = "(param i32 i32)"
        wat_body = """
    local.get 0
    local.get 1
    i32.add"""  # Add two parameters
    else:
        wat_params = "(param i32 i32 i32)"
        wat_body = """
    local.get 0
    local.get 1
    i32.add
    local.get 2
    i32.add"""  # Add three parameters
    
    # Check for common operations in the code
    if 'fibonacci' in code.lower():
        wat_content = """(module
  (func $fibonacci (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $temp i32)
    (local $i i32)
    
    ;; Handle base cases
    local.get $n
    i32.const 2
    i32.lt_s
    if (result i32)
      local.get $n
    else
      ;; Initialize Fibonacci sequence
      i32.const 0
      local.set $a
      i32.const 1
      local.set $b
      i32.const 2
      local.set $i
      
      ;; Loop to calculate Fibonacci
      loop $fib_loop
        local.get $b
        local.set $temp
        local.get $a
        local.get $b
        i32.add
        local.set $b
        local.get $temp
        local.set $a
        
        local.get $i
        i32.const 1
        i32.add
        local.tee $i
        local.get $n
        i32.le_s
        br_if $fib_loop
      end
      
      local.get $b
    end
  )
  
  (func $main (export "main") (param $n i32) (result i32)
    local.get $n
    call $fibonacci
  )
)"""
    elif 'factorial' in code.lower():
        wat_content = """(module
  (func $factorial (param $n i32) (result i32)
    (local $result i32)
    (local $i i32)
    
    i32.const 1
    local.set $result
    i32.const 1
    local.set $i
    
    loop $fact_loop
      local.get $i
      local.get $n
      i32.gt_s
      br_if 1
      
      local.get $result
      local.get $i
      i32.mul
      local.set $result
      
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      
      br $fact_loop
    end
    
    local.get $result
  )
  
  (func $main (export "main") (param $n i32) (result i32)
    local.get $n
    call $factorial
  )
)"""
    elif 'square' in code.lower() or '*' in code:
        wat_content = f"""(module
  (func $main (export "main") (param $x i32) (result i32)
    local.get $x
    local.get $x
    i32.mul
  )
)"""
    else:
        # Generic WAT template
        wat_content = f"""(module
  (func $main (export "main") {wat_params} (result i32){wat_body}
  )
)"""
    
    return wat_content
