(module
  ;; Device proximity proof module
  ;; Verifies if a device is within a certain radius of a center point
  
  ;; Import memory
  (import "env" "memory" (memory 1))
  
  ;; Main function takes 3 arguments: device_id, x, y
  (func $main (param $device_id i32) (param $x i32) (param $y i32) (result i32)
    (local $dx i32)
    (local $dy i32)
    (local $dist_squared i32)
    
    ;; Constants
    (local $center_x i32)
    (local $center_y i32)
    (local $radius_squared i32)
    
    ;; Set center point (5000, 5000)
    (i32.const 5000)
    (local.set $center_x)
    
    (i32.const 5000)
    (local.set $center_y)
    
    ;; Set radius squared (100 * 100 = 10000)
    (i32.const 10000)
    (local.set $radius_squared)
    
    ;; Calculate dx = abs(x - center_x)
    (local.get $x)
    (local.get $center_x)
    (i32.sub)
    (local.tee $dx)
    (i32.const 0)
    (i32.lt_s)
    (if
      (then
        (i32.const 0)
        (local.get $dx)
        (i32.sub)
        (local.set $dx)
      )
    )
    
    ;; Calculate dy = abs(y - center_y)
    (local.get $y)
    (local.get $center_y)
    (i32.sub)
    (local.tee $dy)
    (i32.const 0)
    (i32.lt_s)
    (if
      (then
        (i32.const 0)
        (local.get $dy)
        (i32.sub)
        (local.set $dy)
      )
    )
    
    ;; Calculate distance squared = dx*dx + dy*dy
    (local.get $dx)
    (local.get $dx)
    (i32.mul)
    (local.get $dy)
    (local.get $dy)
    (i32.mul)
    (i32.add)
    (local.set $dist_squared)
    
    ;; Return 1 if within radius, 0 otherwise
    (local.get $dist_squared)
    (local.get $radius_squared)
    (i32.le_u)
  )
  
  ;; Export functions
  (export "main" (func $main))
  
  ;; Helper functions for extracting values
  (func $get_device_id (param $packed i32) (result i32)
    (local.get $packed)
  )
  
  (func $get_x (param $x i32) (result i32)
    (local.get $x)
  )
  
  (func $get_y (param $y i32) (result i32)
    (local.get $y)
  )
  
  (export "get_device_id" (func $get_device_id))
  (export "get_x" (func $get_x))
  (export "get_y" (func $get_y))
)