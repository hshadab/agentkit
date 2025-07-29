(module
  ;; Simple device proximity proof
  ;; Takes 3 i32 arguments and returns 1 if within radius
  
  (func $main (param $device_id i32) (param $x i32) (param $y i32) (result i32)
    (local $dx i32)
    (local $dy i32)
    
    ;; Calculate dx = x - 5000
    (local.get $x)
    (i32.const 5000)
    (i32.sub)
    (local.set $dx)
    
    ;; Calculate dy = y - 5000  
    (local.get $y)
    (i32.const 5000)
    (i32.sub)
    (local.set $dy)
    
    ;; Check if dx*dx + dy*dy <= 10000 (radius 100 squared)
    (local.get $dx)
    (local.get $dx)
    (i32.mul)
    (local.get $dy)
    (local.get $dy)
    (i32.mul)
    (i32.add)
    (i32.const 10000)
    (i32.le_s)
  )
  
  (export "main" (func $main))
)