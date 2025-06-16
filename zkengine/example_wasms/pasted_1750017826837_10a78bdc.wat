(module
  ;; Collatz sequence steps for 27 - REAL ALGORITHM
  (func (export "main") (param $dummy i32) (result i32)
    (local $n i32)
    (local $steps i32)
    
    ;; Initialize
    (local.set $n (i32.const 27))
    (local.set $steps (i32.const 0))
    
    ;; Loop until n = 1
    (block $exit
      (loop $continue
        ;; Exit if n = 1
        (br_if $exit (i32.eq (local.get $n) (i32.const 1)))
        
        ;; Exit if steps > 1000 (safety)
        (br_if $exit (i32.gt_s (local.get $steps) (i32.const 1000)))
        
        ;; If even: n = n / 2
        ;; If odd: n = 3n + 1
        (if (i32.eq (i32.rem_s (local.get $n) (i32.const 2)) (i32.const 0))
          (then
            ;; Even: n = n / 2
            (local.set $n (i32.div_s (local.get $n) (i32.const 2)))
          )
          (else
            ;; Odd: n = 3n + 1
            (local.set $n 
              (i32.add 
                (i32.mul (local.get $n) (i32.const 3))
                (i32.const 1)
              )
            )
          )
        )
        
        ;; Increment steps
        (local.set $steps (i32.add (local.get $steps) (i32.const 1)))
        
        (br $continue)
      )
    )
    
    (local.get $steps)
  )
)