use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde_json::json;

#[derive(Clone, Debug)]
pub struct CachedVerification {
    pub result: String,
    pub timestamp: Instant,
    pub proof_size: u64,
}

pub struct VerificationCache {
    cache: Arc<Mutex<HashMap<String, CachedVerification>>>,
    ttl: Duration,
}

impl VerificationCache {
    pub fn new(ttl_seconds: u64) -> Self {
        VerificationCache {
            cache: Arc::new(Mutex::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    pub fn get(&self, proof_id: &str) -> Option<CachedVerification> {
        if let Ok(cache) = self.cache.lock() {
            if let Some(cached) = cache.get(proof_id) {
                if cached.timestamp.elapsed() < self.ttl {
                    println!("[CACHE HIT] Using cached verification for {}", proof_id);
                    return Some(cached.clone());
                }
            }
        }
        None
    }

    pub fn set(&self, proof_id: String, result: String, proof_size: u64) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(proof_id.clone(), CachedVerification {
                result,
                timestamp: Instant::now(),
                proof_size,
            });
            println!("[CACHE SET] Cached verification for {}", proof_id);
        }
    }

    pub fn clear_expired(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.retain(|_, v| v.timestamp.elapsed() < self.ttl);
        }
    }
}