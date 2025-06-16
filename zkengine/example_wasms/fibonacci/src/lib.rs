#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn fib(n:i32){let(mut a,mut b,mut k)=(0i32,1i32,n);while k>0{let t=a.wrapping_add(b);a=b;b=t;k-=1;}unsafe{(0 as *mut i32).write_volatile(a);}}
