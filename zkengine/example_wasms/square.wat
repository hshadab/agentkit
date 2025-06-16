(module
  (func $square (export "main") (param $n i32) (result i32)
    local.get $n
    local.get $n
    i32.mul
  )
)
