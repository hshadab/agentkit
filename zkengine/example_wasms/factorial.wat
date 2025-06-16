(module
  (func $factorial (export "main") (param $n i32) (result i32)
    (local $result i32)
    (local $i i32)
    
    i32.const 1
    local.set $result
    i32.const 1
    local.set $i
    
    loop $loop
      local.get $result
      local.get $i
      i32.mul
      local.set $result
      
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      
      local.get $i
      local.get $n
      i32.le_s
      br_if $loop
    end
    
    local.get $result
  )
)
