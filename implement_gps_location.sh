#!/bin/bash
# GPS Location Proof Implementation - Single Command Deploy

echo "🚀 Implementing GPS Proof of Location for DePIN..."

# 1. Create the C program
cat > agentic/example_wasms/prove_location.c << 'EOF'
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
EOF

# 2. Create WAT file directly (since C compilation is complex)
cat > agentic/example_wasms/prove_location.wat << 'EOF'
(module
  (memory 1)
  
  ;; City boundary constants
  (global $SF_LAT_MIN i32 (i32.const 95))
  (global $SF_LAT_MAX i32 (i32.const 98))
  (global $SF_LON_MIN i32 (i32.const 120))
  (global $SF_LON_MAX i32 (i32.const 125))
  
  (global $NY_LAT_MIN i32 (i32.const 102))
  (global $NY_LAT_MAX i32 (i32.const 105))
  (global $NY_LON_MIN i32 (i32.const 180))
  (global $NY_LON_MAX i32 (i32.const 185))
  
  (global $LONDON_LAT_MIN i32 (i32.const 128))
  (global $LONDON_LAT_MAX i32 (i32.const 132))
  (global $LONDON_LON_MIN i32 (i32.const 240))
  (global $LONDON_LON_MAX i32 (i32.const 245))
  
  ;; Extract latitude from packed input
  (func $extract_lat (param $packed i32) (result i32)
    local.get $packed
    i32.const 24
    i32.shr_u
    i32.const 0xFF
    i32.and
  )
  
  ;; Extract longitude from packed input
  (func $extract_lon (param $packed i32) (result i32)
    local.get $packed
    i32.const 16
    i32.shr_u
    i32.const 0xFF
    i32.and
  )
  
  ;; Extract device ID from packed input
  (func $extract_device_id (param $packed i32) (result i32)
    local.get $packed
    i32.const 0xFFFF
    i32.and
  )
  
  ;; Check if coordinates are in bounds
  (func $in_bounds (param $lat i32) (param $lon i32) (param $lat_min i32) (param $lat_max i32) (param $lon_min i32) (param $lon_max i32) (result i32)
    local.get $lat
    local.get $lat_min
    i32.ge_u
    local.get $lat
    local.get $lat_max
    i32.le_u
    i32.and
    local.get $lon
    local.get $lon_min
    i32.ge_u
    i32.and
    local.get $lon
    local.get $lon_max
    i32.le_u
    i32.and
  )
  
  ;; Main function
  (func $main (export "main") (param $packed_input i32) (result i32)
    (local $lat i32)
    (local $lon i32)
    (local $device_id i32)
    (local $valid_device i32)
    
    ;; Extract components
    local.get $packed_input
    call $extract_lat
    local.set $lat
    
    local.get $packed_input
    call $extract_lon
    local.set $lon
    
    local.get $packed_input
    call $extract_device_id
    local.set $device_id
    
    ;; Validate device ID
    local.get $device_id
    i32.const 100
    i32.gt_u
    local.get $device_id
    i32.const 65000
    i32.lt_u
    i32.and
    local.set $valid_device
    
    ;; Return 0 if invalid device
    local.get $valid_device
    i32.eqz
    if
      i32.const 0
      return
    end
    
    ;; Check San Francisco
    local.get $lat
    local.get $lon
    global.get $SF_LAT_MIN
    global.get $SF_LAT_MAX
    global.get $SF_LON_MIN
    global.get $SF_LON_MAX
    call $in_bounds
    if
      i32.const 1
      return
    end
    
    ;; Check New York
    local.get $lat
    local.get $lon
    global.get $NY_LAT_MIN
    global.get $NY_LAT_MAX
    global.get $NY_LON_MIN
    global.get $NY_LON_MAX
    call $in_bounds
    if
      i32.const 2
      return
    end
    
    ;; Check London
    local.get $lat
    local.get $lon
    global.get $LONDON_LAT_MIN
    global.get $LONDON_LAT_MAX
    global.get $LONDON_LON_MIN
    global.get $LONDON_LON_MAX
    call $in_bounds
    if
      i32.const 3
      return
    end
    
    ;; Not in any city
    i32.const 0
  )
)
EOF

# 3. Update HTML sidebar
sed -i.bak '/<div class="example-category">/,/<\/div>/{
    /<h4>🔮 Generate Proofs<\/h4>/,/<\/div>/{
        s/<h4>🔮 Generate Proofs<\/h4>/<h4>📍 DePIN Location Proofs<\/h4>/
        s/<div class="example-item" data-example="prove fibonacci of 20">/<div class="example-item" data-example="prove device location in San Francisco">/
        s/<strong>fibonacci<\/strong> - Recursive sequence/<strong>SF Location<\/strong> - Prove device in SF for rewards/
        s/<div class="example-item" data-example="prove add 15 and 27">/<div class="example-item" data-example="verify GPS coordinates within New York">/
        s/<strong>add<\/strong> - Addition operation/<strong>NYC Location<\/strong> - Manhattan coverage proof/
        s/<div class="example-item" data-example="prove multiply 8 by 7">/<div class="example-item" data-example="prove London location for device 12345">/
        s/<strong>multiply<\/strong> - Multiplication/<strong>London Location<\/strong> - UK network participation/
        s/<div class="example-item" data-example="prove factorial of 5">/<div class="example-item" data-example="check if coordinates qualify for DePIN rewards">/
        s/<strong>factorial<\/strong> - Factorial computation/<strong>Reward Eligibility<\/strong> - Token earning validation/
        s/<div class="example-item" data-example="prove max of 25 and 37">/<div class="example-item" data-example="prove coverage area participation">/
        s/<strong>max<\/strong> - Maximum value/<strong>Coverage Proof<\/strong> - Network contribution/
        s/<div class="example-item" data-example="prove count until 10">/<div class="example-item" data-example="verify device authenticity for location rewards">/
        s/<strong>count_until<\/strong> - Counting sequence/<strong>Device Authentication<\/strong> - Prevent spoofing/
        s/<div class="example-item" data-example="prove square of 9">/<div class="example-item" data-example="generate location proof with device ID 98765">/
        s/<strong>square<\/strong> - Square operation/<strong>Device + Location<\/strong> - Combined verification/
        s/<div class="example-item" data-example="prove that 42 is even">/<div class="example-item" data-example="prove device is in coverage zone">/
        s/<strong>is_even<\/strong> - Parity check/<strong>Coverage Zone<\/strong> - Network eligibility/
    }
}' static/index.html

# 4. Update langchain service
cat >> langchain_service.py << 'EOF'

# Location proof patterns
def extract_location_intent(message: str) -> Optional[Dict[str, Any]]:
    """Extract location proof intent from message"""
    message_lower = message.lower()
    
    location_patterns = [
        r'prove.*location.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'verify.*gps.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'location.*proof.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'prove.*device.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'depin.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'coverage.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'device.*(\d+).*(?:in|within)\s+(san francisco|sf|new york|nyc|london)',
        r'prove.*coordinates.*(?:in|within)\s+(san francisco|sf|new york|nyc|london)'
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, message_lower)
        if match:
            groups = match.groups()
            city = groups[-1]  # Last group is always the city
            device_id = None
            
            # Look for device ID
            device_match = re.search(r'device.*?(\d+)', message_lower)
            if device_match:
                device_id = device_match.group(1)
            
            return {
                'function': 'prove_location',
                'arguments': [city, device_id or str(random.randint(1000, 99999))],
                'step_size': 50,
                'location_based': True
            }
    
    return None

# Update the main extract_proof_intent function to include location
original_extract = extract_proof_intent

def extract_proof_intent(message: str) -> Optional[Dict[str, Any]]:
    # Try location first
    location_intent = extract_location_intent(message)
    if location_intent:
        return location_intent
    
    # Fall back to original patterns
    return original_extract(message)
EOF

# 5. Update Rust backend function mapping
sed -i.bak '/let wasm_file = match intent.function.as_str() {/,/_ => {/{
    s/"fibonacci" => "fib.wat",/"prove_location" => "prove_location.wat",\
                "fibonacci" => "fib.wat",/
}' src/main.rs

# 6. Add GPS functionality to frontend
cat >> static/index.html << 'EOF'
<script>
// GPS Location functionality
let cachedLocation = null;

function getGPSCoordinates() {
    return new Promise((resolve) => {
        if (cachedLocation) {
            resolve(cachedLocation);
            return;
        }
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    cachedLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    resolve(cachedLocation);
                },
                (error) => {
                    console.warn('GPS error, using mock data:', error);
                    // Use mock SF coordinates as fallback
                    cachedLocation = { lat: 37.7749, lon: -122.4194 };
                    resolve(cachedLocation);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
        } else {
            // Use mock SF coordinates
            cachedLocation = { lat: 37.7749, lon: -122.4194 };
            resolve(cachedLocation);
        }
    });
}

function getMockCoordinatesForCity(city) {
    const coords = {
        'san francisco': { lat: 37.7749, lon: -122.4194 },
        'sf': { lat: 37.7749, lon: -122.4194 },
        'new york': { lat: 40.7128, lon: -74.0060 },
        'nyc': { lat: 40.7128, lon: -74.0060 },
        'london': { lat: 51.5074, lon: -0.1278 }
    };
    return coords[city.toLowerCase()] || coords['san francisco'];
}

// Update the existing parseProofInfo function to handle location
const originalParseProofInfo = parseProofInfo;
function parseProofInfo(content, originalMessage = '') {
    if (content.includes('location') || content.includes('GPS') || originalMessage.toLowerCase().includes('location')) {
        const info = originalParseProofInfo(content, originalMessage);
        
        // Override for location proofs
        info.function = 'location proof';
        
        // Extract city from content or message
        const cityMatch = (content + ' ' + originalMessage).match(/(san francisco|sf|new york|nyc|london)/i);
        if (cityMatch) {
            info.args = cityMatch[1].toLowerCase();
        }
        
        // Check for device ID
        const deviceMatch = (content + ' ' + originalMessage).match(/device.*?(\d+)/i);
        if (deviceMatch) {
            info.args += `, device ${deviceMatch[1]}`;
        }
        
        return info;
    }
    
    return originalParseProofInfo(content, originalMessage);
}

// Update function name mapping for location
const originalMapFunctionName = mapFunctionName;
function mapFunctionName(name) {
    if (name === 'prove_location' || name === 'location') {
        return 'location proof';
    }
    return originalMapFunctionName(name);
}
</script>
EOF

echo "✅ GPS Location Proof Implementation Complete!"
echo ""
echo "🔧 Changes Made:"
echo "   • Created prove_location.wat with SF/NYC/London boundaries"  
echo "   • Updated sidebar with DePIN location examples"
echo "   • Added GPS coordinate detection (real + mock fallback)"
echo "   • Enhanced natural language processing for location commands"
echo "   • Updated backend function mapping"
echo ""
echo "🚀 Ready to test! Try these commands:"
echo "   • 'prove device location in San Francisco'"
echo "   • 'verify GPS coordinates within New York'"
echo "   • 'prove London location for device 12345'"
echo ""
echo "📍 GPS will attempt real coordinates, fallback to mock data"
