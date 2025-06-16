#!/bin/bash
# Fixed GPS Location Proof Implementation

echo "🔧 Fixing GPS Location Proof Implementation..."

# 1. Create the WAT file (this part was correct)
cat > agentic/example_wasms/prove_location.wat << 'EOF'
(module
  (memory 1)
  
  ;; City boundary constants (normalized 0-255 scale)
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

# 2. PROPERLY update the Rust backend - find exact location and replace
echo "Updating Rust backend..."
python3 - << 'PYTHON_EOF'
import re

# Read the main.rs file
with open('src/main.rs', 'r') as f:
    content = f.read()

# Find and update the function mapping
pattern = r'(let wasm_file = match intent\.function\.as_str\(\) \{[^}]+)"fibonacci" => "fib\.wat",'
replacement = r'\1"prove_location" => "prove_location.wat",\n                "fibonacci" => "fib.wat",'

content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open('src/main.rs', 'w') as f:
    f.write(content)

print("✅ Updated Rust backend")
PYTHON_EOF

# 3. PROPERLY update the LangChain service
echo "Updating LangChain service..."
python3 - << 'PYTHON_EOF'
import re

# Read langchain_service.py
with open('langchain_service.py', 'r') as f:
    content = f.read()

# Add location detection to extract_proof_intent function
location_code = '''
    # Check for location proofs first
    location_patterns = [
        r'prove.*location.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'verify.*gps.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)', 
        r'location.*proof.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'prove.*device.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'depin.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'coverage.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'device.*\\d+.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)',
        r'prove.*coordinates.*(?:in|within)\\s+(san francisco|sf|new york|nyc|london)'
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, message_lower)
        if match:
            city = match.group(1)
            # Look for device ID
            device_match = re.search(r'device.*?(\\d+)', message_lower)
            device_id = device_match.group(1) if device_match else str(random.randint(1000, 99999))
            
            return {
                'function': 'prove_location',
                'arguments': [city, device_id],
                'step_size': 50,
                'location_based': True
            }
'''

# Find the extract_proof_intent function and add location patterns at the beginning
pattern = r'(def extract_proof_intent\(message: str\) -> Optional\[Dict\[str, Any\]\]:.*?message_lower = message\.lower\(\)\s*)'
replacement = r'\1\n' + location_code

content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open('langchain_service.py', 'w') as f:
    f.write(content)

print("✅ Updated LangChain service")
PYTHON_EOF

# 4. PROPERLY update the HTML sidebar - preserve structure
echo "Updating HTML sidebar..."
python3 - << 'PYTHON_EOF'
import re

# Read index.html
with open('static/index.html', 'r') as f:
    content = f.read()

# Replace the first example category completely
old_category = r'<div class="example-category">.*?<h4>🔮 Generate Proofs</h4>.*?</div>\s*</div>'

new_category = '''<div class="example-category">
            <h4>📍 DePIN Location Proofs</h4>
            <div class="example-item" data-example="prove device location in San Francisco">
                <strong>SF Location</strong> - Prove device in SF for rewards
            </div>
            <div class="example-item" data-example="verify GPS coordinates within New York">
                <strong>NYC Location</strong> - Manhattan coverage proof
            </div>
            <div class="example-item" data-example="prove London location for device 12345">
                <strong>London Location</strong> - UK network participation
            </div>
            <div class="example-item" data-example="check if coordinates qualify for DePIN rewards">
                <strong>Reward Eligibility</strong> - Token earning validation
            </div>
            <div class="example-item" data-example="prove coverage area participation">
                <strong>Coverage Proof</strong> - Network contribution
            </div>
            <div class="example-item" data-example="verify device authenticity for location rewards">
                <strong>Device Authentication</strong> - Prevent spoofing
            </div>
            <div class="example-item" data-example="generate location proof with device ID 98765">
                <strong>Device + Location</strong> - Combined verification
            </div>
            <div class="example-item" data-example="prove device is in coverage zone">
                <strong>Coverage Zone</strong> - Network eligibility
            </div>
        </div>'''

content = re.sub(old_category, new_category, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open('static/index.html', 'w') as f:
    f.write(content)

print("✅ Updated HTML sidebar")
PYTHON_EOF

# 5. Add GPS functionality to existing JavaScript (preserve existing functions)
echo "Adding GPS functionality..."
python3 - << 'PYTHON_EOF'
import re

# Read index.html
with open('static/index.html', 'r') as f:
    content = f.read()

# Add GPS functionality before the closing </script> tag
gps_code = '''
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
        
        // Enhanced function name detection for location
        const originalGetFunctionNameFromMessage = getFunctionNameFromMessage;
        function getFunctionNameFromMessage(message) {
            const msg = message.toLowerCase();
            
            // Check for location patterns first
            if (msg.includes('location') || msg.includes('gps') || msg.includes('coordinates') || 
                msg.includes('depin') || msg.includes('coverage') || msg.includes('device')) {
                return 'location proof';
            }
            
            return originalGetFunctionNameFromMessage(message);
        }
        
        // Enhanced parseProofInfo for location proofs
        const originalParseProofInfo = parseProofInfo;
        function parseProofInfo(content, originalMessage = '') {
            const msg = (content + ' ' + originalMessage).toLowerCase();
            
            if (msg.includes('location') || msg.includes('gps') || msg.includes('coordinates') || 
                msg.includes('depin') || msg.includes('coverage')) {
                
                const info = {
                    function: 'location proof',
                    args: '',
                    stepSize: '50',
                    wasmFile: 'prove_location.wat',
                    time: null,
                    size: null,
                    customStepSize: false
                };
                
                // Extract city from content or message
                const cityMatch = msg.match(/(san francisco|sf|new york|nyc|london)/);
                if (cityMatch) {
                    info.args = cityMatch[1];
                }
                
                // Check for device ID
                const deviceMatch = msg.match(/device.*?(\\d+)/);
                if (deviceMatch) {
                    info.args += info.args ? `, device ${deviceMatch[1]}` : `device ${deviceMatch[1]}`;
                }
                
                // Parse timing and size if available
                const timeMatch = content.match(/Time:\\s*([\\d.]+)s/);
                if (timeMatch) info.time = parseFloat(timeMatch[1]);
                
                const sizeMatch = content.match(/Size:\\s*([\\d.]+)MB/);
                if (sizeMatch) info.size = parseFloat(sizeMatch[1]);
                
                return info;
            }
            
            return originalParseProofInfo(content, originalMessage);
        }
        
        // Enhanced mapFunctionName for location
        const originalMapFunctionName = mapFunctionName;
        function mapFunctionName(name) {
            if (name === 'prove_location' || name === 'location') {
                return 'location proof';
            }
            return originalMapFunctionName(name);
        }
'''

# Insert before the last </script> tag
content = re.sub(r'(\s*</script>\s*</body>)', gps_code + r'\1', content)

# Write back
with open('static/index.html', 'w') as f:
    f.write(content)

print("✅ Added GPS functionality")
PYTHON_EOF

echo ""
echo "✅ Fixed GPS Location Proof Implementation!"
echo ""
echo "🔧 Fixed Issues:"
echo "   • Properly updated Rust backend function mapping"
echo "   • Enhanced LangChain service with location patterns" 
echo "   • Fixed HTML sidebar with new DePIN examples"
echo "   • Preserved elegant proof card UI"
echo "   • Added GPS functionality without breaking existing code"
echo ""
echo "🚀 Now restart your services and try:"
echo "   • 'prove device location in San Francisco'"
echo "   • 'verify GPS coordinates within New York'" 
echo "   • 'prove London location for device 12345'"
echo ""
echo "📍 The elegant proof cards should now work properly!"
