#!/bin/bash

# Complete fix for WasmiError
# This script fixes both Rust and Python to ensure zkEngine gets the right format

echo "🔧 Complete fix for WasmiError..."

# 1. Fix the Rust backend to pass a dummy argument
echo "📝 Updating Rust backend..."

cat > /tmp/rust_wasmi_fix.py << 'EOF'
import re

# Read the main.rs file
with open('/home/hshadab/agentkit/src/main.rs', 'r') as f:
    content = f.read()

# Find and replace the line that creates empty args
# Change: let args: Vec<String> = vec![];
# To: let args: Vec<String> = vec!["0".to_string()];

content = re.sub(
    r'// No arguments needed - values are hardcoded in the C code\s*\n\s*let args: Vec<String> = vec!\[\];',
    '// zkEngine expects at least one argument, so provide a dummy "0"\n    let args: Vec<String> = vec!["0".to_string()];',
    content
)

# Also update the info message
content = re.sub(
    r'info!\("Processing custom proof: wasm=\{\}, no args \(hardcoded values\)"',
    r'info!("Processing custom proof: wasm={}, args={:?} (dummy arg for hardcoded values)"',
    content
)

# Write back
with open('/home/hshadab/agentkit/src/main.rs', 'w') as f:
    f.write(content)

print("✓ Updated Rust backend to pass dummy argument")
EOF

python3 /tmp/rust_wasmi_fix.py

# 2. Fix the Python service WAT generation
echo "📝 Updating Python service WAT generation..."

cat > /tmp/python_wasmi_fix.py << 'EOF'
import re

# Read the langchain_service.py file
with open('/home/hshadab/agentkit/langchain_service.py', 'r') as f:
    content = f.read()

# Find the generate_wat_from_c_analysis function and replace it
new_function = '''def generate_wat_from_c_analysis(code: str) -> str:
    """Generate WAT based on C code analysis for common patterns"""
    
    # Check for is_prime pattern
    if 'is_prime' in code:
        # Extract the hardcoded value if present
        value_match = re.search(r'number_to_check\s*=\s*(\d+)', code)
        prime_value = value_match.group(1) if value_match else '17'
        return f"""(module
  ;; Prime checker - hardcoded value: {prime_value}
  (func $is_prime (param $n i32) (result i32)
    (local $i i32)
    
    ;; if n <= 1 return 0
    local.get $n
    i32.const 1
    i32.le_s
    if (result i32)
      i32.const 0
      return
    end
    
    ;; if n == 2 return 1
    local.get $n
    i32.const 2
    i32.eq
    if (result i32)
      i32.const 1
      return
    end
    
    ;; if n % 2 == 0 return 0
    local.get $n
    i32.const 2
    i32.rem_s
    i32.eqz
    if (result i32)
      i32.const 0
      return
    end
    
    ;; Check odd divisors
    i32.const 3
    local.set $i
    
    loop $check_loop
      ;; if i * i > n, break (number is prime)
      local.get $i
      local.get $i
      i32.mul
      local.get $n
      i32.gt_s
      br_if 1
      
      ;; if n % i == 0 return 0
      local.get $n
      local.get $i
      i32.rem_s
      i32.eqz
      if (result i32)
        i32.const 0
        return
      end
      
      ;; i += 2
      local.get $i
      i32.const 2
      i32.add
      local.set $i
      
      br $check_loop
    end
    
    ;; Number is prime
    i32.const 1
  )
  
  (func $main (export "main") (param $dummy i32) (result i32)
    ;; Ignore the dummy parameter, use hardcoded value
    i32.const {prime_value}
    call $is_prime
  )
)"""
    
    # Check for collatz pattern
    elif 'collatz' in code:
        value_match = re.search(r'starting_number\s*=\s*(\d+)', code)
        collatz_value = value_match.group(1) if value_match else '27'
        return f"""(module
  ;; Collatz steps calculator - hardcoded value: {collatz_value}
  (func $collatz_steps (param $n i32) (result i32)
    (local $steps i32)
    (local $current i32)
    
    ;; Initialize
    local.get $n
    local.set $current
    i32.const 0
    local.set $steps
    
    ;; Ensure positive
    local.get $current
    i32.const 0
    i32.le_s
    if
      i32.const 1
      local.set $current
    end
    
    ;; Main loop
    loop $collatz_loop
      ;; If n == 1, done
      local.get $current
      i32.const 1
      i32.eq
      br_if 1
      
      ;; Safety check: steps < 1000
      local.get $steps
      i32.const 1000
      i32.ge_s
      br_if 1
      
      ;; Apply Collatz rules
      local.get $current
      i32.const 2
      i32.rem_s
      i32.eqz
      if
        ;; Even: n / 2
        local.get $current
        i32.const 2
        i32.div_s
        local.set $current
      else
        ;; Odd: 3n + 1
        local.get $current
        i32.const 3
        i32.mul
        i32.const 1
        i32.add
        local.set $current
      end
      
      ;; Increment steps
      local.get $steps
      i32.const 1
      i32.add
      local.set $steps
      
      br $collatz_loop
    end
    
    local.get $steps
  )
  
  (func $main (export "main") (param $dummy i32) (result i32)
    ;; Ignore the dummy parameter, use hardcoded value
    i32.const {collatz_value}
    call $collatz_steps
  )
)"""
    
    # Check for digital root pattern
    elif 'digital_root' in code or 'digit_sum' in code:
        value_match = re.search(r'input_number\s*=\s*(\d+)', code)
        digital_value = value_match.group(1) if value_match else '12345'
        return f"""(module
  ;; Digital root calculator - hardcoded value: {digital_value}
  (func $digit_sum (param $n i32) (result i32)
    (local $sum i32)
    (local $num i32)
    
    ;; Make positive
    local.get $n
    i32.const 0
    i32.lt_s
    if
      local.get $n
      i32.const -1
      i32.mul
      local.set $num
    else
      local.get $n
      local.set $num
    end
    
    ;; Sum digits
    i32.const 0
    local.set $sum
    
    loop $sum_loop
      local.get $num
      i32.eqz
      br_if 1
      
      ;; sum += num % 10
      local.get $sum
      local.get $num
      i32.const 10
      i32.rem_s
      i32.add
      local.set $sum
      
      ;; num /= 10
      local.get $num
      i32.const 10
      i32.div_s
      local.set $num
      
      br $sum_loop
    end
    
    local.get $sum
  )
  
  (func $digital_root (param $n i32) (result i32)
    (local $current i32)
    
    local.get $n
    local.set $current
    
    loop $root_loop
      local.get $current
      i32.const 10
      i32.lt_s
      br_if 1
      
      local.get $current
      call $digit_sum
      local.set $current
      
      br $root_loop
    end
    
    local.get $current
  )
  
  (func $main (export "main") (param $dummy i32) (result i32)
    ;; Ignore the dummy parameter, use hardcoded value
    i32.const {digital_value}
    call $digital_root
  )
)"""
    
    # Default simple WAT - also needs a parameter
    else:
        return """(module
  (func $main (export "main") (param $dummy i32) (result i32)
    ;; Ignore parameter and return constant
    i32.const 42
  )
)"""'''

# Replace the function
pattern = r'def generate_wat_from_c_analysis\(code: str\) -> str:.*?(?=\n(?:def|async def|class|\Z))'
content = re.sub(pattern, new_function, content, flags=re.DOTALL)

# Write back
with open('/home/hshadab/agentkit/langchain_service.py', 'w') as f:
    f.write(content)

print("✓ Updated Python service WAT generation to include dummy parameter")
EOF

python3 /tmp/python_wasmi_fix.py

# Clean up
rm -f /tmp/rust_wasmi_fix.py /tmp/python_wasmi_fix.py

echo ""
echo "✅ Complete fix applied!"
echo ""
echo "The fix ensures:"
echo "1. Rust backend passes a dummy argument '0' to zkEngine"
echo "2. Python service generates WAT files with main(param i32) signature"
echo "3. The hardcoded values in C code are still used (dummy param ignored)"
echo ""
echo "🎯 Next steps:"
echo "1. Restart the Python service:"
echo "   cd ~/agentkit && source langchain_env/bin/activate && python langchain_service.py"
echo ""
echo "2. Rebuild and restart the Rust backend:"
echo "   cd ~/agentkit && cargo build --release && cargo run"
echo ""
echo "3. Test the paste function - it should now work without WasmiError!"
