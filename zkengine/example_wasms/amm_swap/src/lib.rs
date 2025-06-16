#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn amm_swap(x:i32,y:i32,dx:i32){let k=(x as i64)*(y as i64);let new_x=(x as i64)+(dx as i64);let new_y=k/new_x;let dy=(y as i64)-new_y;unsafe{(0 as *mut i32).write_volatile(dy as i32);}}
