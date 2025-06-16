#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn factorial(n:i32){let mut acc=1i32;for i in 2..=n{acc=acc.wrapping_mul(i);}unsafe{(0 as *mut i32).write_volatile(acc);}}
