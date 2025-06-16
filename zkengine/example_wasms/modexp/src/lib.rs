#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn modexp(base:i32,exp:i32,modulus:i32){let(mut b,mut e,m)=(base as i64,exp as u32,modulus as i64);let mut r=1i64;while e>0{if e&1==1{r=(r*b)%m;}b=(b*b)%m;e>>=1;}unsafe{(0 as *mut i32).write_volatile(r as i32);}}
