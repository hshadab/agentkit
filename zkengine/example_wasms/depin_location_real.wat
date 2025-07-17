(module
  (type (;0;) (func (param i32) (result i32)))
  (type (;1;) (func))
  (func (;0;) (type 1)
    nop)
  (func (;1;) (type 0) (param i32) (result i32)
    local.get 0
    i32.const 24
    i32.shr_u)
  (func (;2;) (type 0) (param i32) (result i32)
    local.get 0
    i32.const 16
    i32.shr_u
    i32.const 255
    i32.and)
  (func (;3;) (type 0) (param i32) (result i32)
    local.get 0
    i32.const 65535
    i32.and)
  (func (;4;) (type 0) (param i32) (result i32)
    (local i32)
    block (result i32)  ;; label = @1
      i32.const 0
      local.get 0
      i32.const 65535
      i32.and
      i32.const 101
      i32.sub
      i32.const 64898
      i32.gt_u
      br_if 0 (;@1;)
      drop
      local.get 0
      i32.const 16
      i32.shr_u
      i32.const 255
      i32.and
      local.set 1
      local.get 0
      i32.const 1593835520
      i32.sub
      i32.const 67108863
      i32.le_u
      if  ;; label = @2
        i32.const 1
        local.get 1
        i32.const 120
        i32.sub
        i32.const 6
        i32.lt_u
        br_if 1 (;@1;)
        drop
      end
      local.get 0
      i32.const 1711276032
      i32.sub
      i32.const 67108863
      i32.le_u
      if  ;; label = @2
        i32.const 2
        local.get 1
        i32.const 180
        i32.sub
        i32.const 6
        i32.lt_u
        br_if 1 (;@1;)
        drop
      end
      i32.const 3
      i32.const 0
      local.get 1
      i32.const 240
      i32.sub
      i32.const 6
      i32.lt_u
      select
      i32.const 0
      local.get 0
      i32.const -2063597568
      i32.lt_s
      select
    end)
  (memory (;0;) 2)
  (global (;0;) i32 (i32.const 1024))
  (global (;1;) i32 (i32.const 1024))
  (global (;2;) i32 (i32.const 1024))
  (global (;3;) i32 (i32.const 66560))
  (global (;4;) i32 (i32.const 1024))
  (global (;5;) i32 (i32.const 66560))
  (global (;6;) i32 (i32.const 131072))
  (global (;7;) i32 (i32.const 0))
  (global (;8;) i32 (i32.const 1))
  (export "memory" (memory 0))
  (export "__wasm_call_ctors" (func 0))
  (export "extract_lat" (func 1))
  (export "extract_lon" (func 2))
  (export "extract_device_id" (func 3))
  (export "main" (func 4))
  (export "__dso_handle" (global 0))
  (export "__data_end" (global 1))
  (export "__stack_low" (global 2))
  (export "__stack_high" (global 3))
  (export "__global_base" (global 4))
  (export "__heap_base" (global 5))
  (export "__heap_end" (global 6))
  (export "__memory_base" (global 7))
  (export "__table_base" (global 8)))
