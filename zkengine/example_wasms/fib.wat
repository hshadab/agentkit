(module
  (func $fib (export "main") (param $n i32) (result i32)
    (local $i i32)
    (local $a i32)
    (local $b i32)
    (local $temp i32)
    
    local.get $n
    i32.const 2
    i32.lt_s
    if
      local.get $n
      return
    end
    
    i32.const 0
    local.set $a
    i32.const 1
    local.set $b
    i32.const 2
    local.set $i
    
    loop $loop
      local.get $a
      local.get $b
      i32.add
      local.set $temp
      
      local.get $b
      local.set $a
      local.get $temp
      local.set $b
      
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      
      local.get $i
      local.get $n
      i32.le_s
      br_if $loop
    end
    
    local.get $b
  )
)
