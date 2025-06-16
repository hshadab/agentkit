#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn gcd(mut a:i32,mut b:i32){while b!=0{let t=b;b=a%b;a=t;}unsafe{(0 as *mut i32).write_volatile(a.abs());}}
