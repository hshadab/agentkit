(module
  (func (export "main") (param i32) (result i32)
    (local $result i32)
    (local.set $result (i32.const 0))
    
    ;; First condition
    (if (i32.gt_s (i32.const 10) (i32.const 5))
      (then
        (local.set $result (i32.add (local.get $result) (i32.const 1)))
      )
    )
    
    ;; Second condition
    (if (i32.lt_s (i32.const 3) (i32.const 7))
      (then
        (local.set $result (i32.add (local.get $result) (i32.const 1)))
      )
    )
    
    (local.get $result)
  )
)
