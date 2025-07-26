// Device Proximity Proof Generation
// Integrates ProximityCircuit with the existing proof system

use serde::{Deserialize, Serialize};
use sha2::Digest;
use std::error::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceLocation {
    pub x: u64,
    pub y: u64,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProximityProofResult {
    pub device_id: String,
    pub is_within_radius: bool,
    pub proof_data: Vec<u8>,
    pub public_inputs: Vec<String>,
}

/// Generate a proximity proof for a device location
pub fn generate_device_proximity_proof(
    location: DeviceLocation,
) -> Result<ProximityProofResult, Box<dyn Error + Send + Sync>> {
    // For now, we'll create a simplified proof
    // In production, this would use the full Nova proving system
    let is_within_radius = check_proximity(location.x, location.y);
    
    // Create mock proof data for now
    let proof_data = format!(
        "device_proximity_proof_{}_{}_{}",
        location.device_id, location.x, location.y
    )
    .as_bytes()
    .to_vec();

    // Public inputs include device ID hash and proximity result
    let device_id_hash = sha2::Sha256::digest(location.device_id.as_bytes());
    let public_inputs = vec![
        hex::encode(device_id_hash),
        if is_within_radius { "1" } else { "0" }.to_string(),
        location.x.to_string(),
        location.y.to_string(),
    ];

    Ok(ProximityProofResult {
        device_id: location.device_id,
        is_within_radius,
        proof_data,
        public_inputs,
    })
}

/// Check if coordinates are within the proximity radius
fn check_proximity(x: u64, y: u64) -> bool {
    const CENTER_X: u64 = 5000;
    const CENTER_Y: u64 = 5000;
    const RADIUS: u64 = 100;

    let dx = if x > CENTER_X { x - CENTER_X } else { CENTER_X - x };
    let dy = if y > CENTER_Y { y - CENTER_Y } else { CENTER_Y - y };
    
    // Check if distance squared is within radius squared
    (dx * dx + dy * dy) <= (RADIUS * RADIUS)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proximity_check() {
        // Device within radius
        assert!(check_proximity(5050, 5050));
        
        // Device at center
        assert!(check_proximity(5000, 5000));
        
        // Device on radius boundary
        assert!(check_proximity(5100, 5000));
        
        // Device outside radius
        assert!(!check_proximity(5200, 5200));
    }

    #[test]
    fn test_generate_proximity_proof() {
        let location = DeviceLocation {
            x: 5050,
            y: 5050,
            device_id: "DEV123".to_string(),
        };

        let result = generate_device_proximity_proof(location).unwrap();
        assert!(result.is_within_radius);
        assert_eq!(result.device_id, "DEV123");
        assert_eq!(result.public_inputs.len(), 4);
    }
}