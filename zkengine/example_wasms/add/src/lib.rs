#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn add(a:i32,b:i32){unsafe{(0 as *mut i32).write_volatile(a.wrapping_add(b));}}
