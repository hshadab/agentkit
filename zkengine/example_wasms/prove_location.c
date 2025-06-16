// prove_location.c - GPS location proof for DePIN token rewards
// Proves device is within city bounds without revealing exact coordinates

// Helper functions for bit manipulation
int extract_lat(int packed) {
    return (packed >> 24) & 0xFF;
}

int extract_lon(int packed) {
    return (packed >> 16) & 0xFF; 
}

int extract_device_id(int packed) {
    return packed & 0xFFFF;
}

int main(int packed_input) {
    // Unpack input: lat, lon, device_id (simplified for demo)
    // GPS coordinates mapped to 0-255 range for simplicity
    // SF: lat~38, lon~122 -> normalized values
    
    int lat = extract_lat(packed_input);      // Normalized latitude
    int lon = extract_lon(packed_input);      // Normalized longitude  
    int device_id = extract_device_id(packed_input);
    
    // City boundaries (normalized 0-255 scale)
    // San Francisco bounds (lat: 37.7-37.8, lon: -122.5 to -122.4)
    int sf_lat_min = 95;   // ~37.7 normalized
    int sf_lat_max = 98;   // ~37.8 normalized  
    int sf_lon_min = 120;  // ~-122.5 normalized
    int sf_lon_max = 125;  // ~-122.4 normalized
    
    // New York bounds (lat: 40.7-40.8, lon: -74.1 to -74.0)
    int ny_lat_min = 102;  // ~40.7 normalized
    int ny_lat_max = 105;  // ~40.8 normalized
    int ny_lon_min = 180;  // ~-74.1 normalized  
    int ny_lon_max = 185;  // ~-74.0 normalized
    
    // London bounds (lat: 51.4-51.6, lon: -0.2 to 0.1)
    int london_lat_min = 128; // ~51.4 normalized
    int london_lat_max = 132; // ~51.6 normalized
    int london_lon_min = 240; // ~-0.2 normalized
    int london_lon_max = 245; // ~0.1 normalized
    
    // Device ID validation (prevent spoofing)
    int valid_device = (device_id > 100 && device_id < 65000);
    
    if (!valid_device) return 0;
    
    // Check which city (return city code)
    if (lat >= sf_lat_min && lat <= sf_lat_max && lon >= sf_lon_min && lon <= sf_lon_max) {
        return 1; // San Francisco
    }
    if (lat >= ny_lat_min && lat <= ny_lat_max && lon >= ny_lon_min && lon <= ny_lon_max) {
        return 2; // New York
    }
    if (lat >= london_lat_min && lat <= london_lat_max && lon >= london_lon_min && lon <= london_lon_max) {
        return 3; // London
    }
    
    return 0; // Not in any supported city
}
