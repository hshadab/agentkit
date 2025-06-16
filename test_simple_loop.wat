(module
  (func (export "main") (param i32) (result i32)
    (local $counter i32)
    (local $sum i32)
    
    (local.set $counter (i32.const 0))
    (local.set $sum (i32.const 0))
    
    (block $exit
      (loop $continue
        (local.set $sum 
          (i32.add (local.get $sum) (i32.const 1)))
        (local.set $counter 
          (i32.add (local.get $counter) (i32.const 1)))
        (br_if $exit 
          (i32.ge_s (local.get $counter) (i32.const 5)))
        (br $continue)
      )
    )
    (local.get $sum)
  )
)
