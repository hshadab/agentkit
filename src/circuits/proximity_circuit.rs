// Proximity Circuit for IoT Device Verification
// Simplified version for integration with existing proof system

/// ProximityCircuit placeholder for device proximity verification
/// Full implementation would use Nova IVC from device_registration repo
#[derive(Clone, Debug, Default)]
pub struct ProximityCircuit {
    pub x: u64,
    pub y: u64,
}

impl ProximityCircuit {
    pub fn new(x: u64, y: u64) -> Self {
        Self { x, y }
    }
    
    /// Check if the coordinates are within the proximity radius
    pub fn check_proximity(&self) -> bool {
        const CENTER_X: u64 = 5000;
        const CENTER_Y: u64 = 5000;
        const RADIUS: u64 = 100;
        
        let dx = if self.x > CENTER_X { self.x - CENTER_X } else { CENTER_X - self.x };
        let dy = if self.y > CENTER_Y { self.y - CENTER_Y } else { CENTER_Y - self.y };
        
        (dx * dx + dy * dy) <= (RADIUS * RADIUS)
    }
}