(module
  ;; Digital root calculator for 12345 - REAL ALGORITHM
  (func (export "main") (param $dummy i32) (result i32)
    (local $n i32)
    (local $sum i32)
    (local $digit i32)
    
    ;; Initialize
    (local.set $n (i32.const 12345))
    
    ;; Loop until single digit
    (block $outer_exit
      (loop $outer_continue
        ;; Exit if n < 10 (single digit)
        (br_if $outer_exit (i32.lt_s (local.get $n) (i32.const 10)))
        
        ;; Calculate digit sum
        (local.set $sum (i32.const 0))
        (block $inner_exit
          (loop $inner_continue
            ;; Exit if n = 0
            (br_if $inner_exit (i32.eq (local.get $n) (i32.const 0)))
            
            ;; Get last digit
            (local.set $digit (i32.rem_s (local.get $n) (i32.const 10)))
            ;; Add to sum
            (local.set $sum (i32.add (local.get $sum) (local.get $digit)))
            ;; Remove last digit
            (local.set $n (i32.div_s (local.get $n) (i32.const 10)))
            
            (br $inner_continue)
          )
        )
        
        ;; Set n to sum for next iteration
        (local.set $n (local.get $sum))
        
        (br $outer_continue)
      )
    )
    
    (local.get $n)
  )
)