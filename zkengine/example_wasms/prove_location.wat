(module
  (memory 1)
  
  ;; City boundary constants (normalized 0-255 scale)
  (global $SF_LAT_MIN i32 (i32.const 95))
  (global $SF_LAT_MAX i32 (i32.const 98))
  (global $SF_LON_MIN i32 (i32.const 120))
  (global $SF_LON_MAX i32 (i32.const 125))
  
  (global $NY_LAT_MIN i32 (i32.const 102))
  (global $NY_LAT_MAX i32 (i32.const 105))
  (global $NY_LON_MIN i32 (i32.const 180))
  (global $NY_LON_MAX i32 (i32.const 185))
  
  (global $LONDON_LAT_MIN i32 (i32.const 128))
  (global $LONDON_LAT_MAX i32 (i32.const 132))
  (global $LONDON_LON_MIN i32 (i32.const 240))
  (global $LONDON_LON_MAX i32 (i32.const 245))
  
  ;; Extract latitude from packed input
  (func $extract_lat (param $packed i32) (result i32)
    local.get $packed
    i32.const 24
    i32.shr_u
    i32.const 0xFF
    i32.and
  )
  
  ;; Extract longitude from packed input
  (func $extract_lon (param $packed i32) (result i32)
    local.get $packed
    i32.const 16
    i32.shr_u
    i32.const 0xFF
    i32.and
  )
  
  ;; Extract device ID from packed input
  (func $extract_device_id (param $packed i32) (result i32)
    local.get $packed
    i32.const 0xFFFF
    i32.and
  )
  
  ;; Check if coordinates are in bounds
  (func $in_bounds (param $lat i32) (param $lon i32) (param $lat_min i32) (param $lat_max i32) (param $lon_min i32) (param $lon_max i32) (result i32)
    local.get $lat
    local.get $lat_min
    i32.ge_u
    local.get $lat
    local.get $lat_max
    i32.le_u
    i32.and
    local.get $lon
    local.get $lon_min
    i32.ge_u
    i32.and
    local.get $lon
    local.get $lon_max
    i32.le_u
    i32.and
  )
  
  ;; Main function
  (func $main (export "main") (param $packed_input i32) (result i32)
    (local $lat i32)
    (local $lon i32)
    (local $device_id i32)
    (local $valid_device i32)
    
    ;; Extract components
    local.get $packed_input
    call $extract_lat
    local.set $lat
    
    local.get $packed_input
    call $extract_lon
    local.set $lon
    
    local.get $packed_input
    call $extract_device_id
    local.set $device_id
    
    ;; Validate device ID
    local.get $device_id
    i32.const 100
    i32.gt_u
    local.get $device_id
    i32.const 65000
    i32.lt_u
    i32.and
    local.set $valid_device
    
    ;; Return 0 if invalid device
    local.get $valid_device
    i32.eqz
    if
      i32.const 0
      return
    end
    
    ;; Check San Francisco
    local.get $lat
    local.get $lon
    global.get $SF_LAT_MIN
    global.get $SF_LAT_MAX
    global.get $SF_LON_MIN
    global.get $SF_LON_MAX
    call $in_bounds
    if
      i32.const 1
      return
    end
    
    ;; Check New York
    local.get $lat
    local.get $lon
    global.get $NY_LAT_MIN
    global.get $NY_LAT_MAX
    global.get $NY_LON_MIN
    global.get $NY_LON_MAX
    call $in_bounds
    if
      i32.const 2
      return
    end
    
    ;; Check London
    local.get $lat
    local.get $lon
    global.get $LONDON_LAT_MIN
    global.get $LONDON_LAT_MAX
    global.get $LONDON_LON_MIN
    global.get $LONDON_LON_MAX
    call $in_bounds
    if
      i32.const 3
      return
    end
    
    ;; Not in any city
    i32.const 0
  )
)
