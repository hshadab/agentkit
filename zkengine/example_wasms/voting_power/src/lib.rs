#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn voting_power(votes:i32){let cost=(votes as i64)*(votes as i64);unsafe{(0 as *mut i32).write_volatile(cost as i32);}}
