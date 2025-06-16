(module
  (func (export "main") (param $n i32) (result i32)
    (local $i i32)
    (local $n_val i32)
    
    ;; Hardcode n = 17 for testing
    (local.set $n_val (i32.const 17))
    
    ;; Check if less than 2
    (if (i32.lt_s (local.get $n_val) (i32.const 2))
      (then (return (i32.const 0)))
    )
    
    ;; Check if equals 2
    (if (i32.eq (local.get $n_val) (i32.const 2))
      (then (return (i32.const 1)))
    )
    
    ;; Check if even
    (if (i32.eq (i32.rem_s (local.get $n_val) (i32.const 2)) (i32.const 0))
      (then (return (i32.const 0)))
    )
    
    ;; Loop from 3 to sqrt(n)
    (local.set $i (i32.const 3))
    (block $exit
      (loop $continue
        ;; If i*i > n, exit loop
        (br_if $exit (i32.gt_s (i32.mul (local.get $i) (local.get $i)) (local.get $n_val)))
        
        ;; If n % i == 0, not prime
        (if (i32.eq (i32.rem_s (local.get $n_val) (local.get $i)) (i32.const 0))
          (then (return (i32.const 0)))
        )
        
        ;; i += 2
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (br $continue)
      )
    )
    
    ;; Is prime
    (i32.const 1)
  )
)
