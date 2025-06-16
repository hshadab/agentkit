(module
  (func $subtract (export "main") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.sub
  )
)
