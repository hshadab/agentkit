# Auto Cache Busting System

## Overview
The auto cache busting system automatically generates unique timestamps to force browser cache refreshes whenever the server restarts. This solves the persistent problem of browsers showing cached versions of updated JavaScript files.

## Files Created
- `update_cache_busters.py` - Python script that updates cache-busting parameters
- `start_servers.sh` - Startup script that runs cache buster and starts servers
- `static/js/core/auto-cache-buster.js` - Browser-side cache management
- `static/.cache-buster` - Stores current cache buster timestamp

## Usage

### Start Servers (Recommended)
```bash
./start_servers.sh
```
This automatically:
1. Stops existing servers
2. Generates new cache buster timestamp (format: YYYYMMDD-HHMMSS)
3. Updates all cache-busting parameters in HTML/JS files
4. Starts both static and API servers
5. Forces browser cache refresh

### Manual Cache Buster Update
```bash
python3 update_cache_busters.py
```

### Health Check
The API server now provides a health check endpoint:
```bash
curl http://localhost:8002/health-check
```
Returns:
```json
{
  "status": "healthy",
  "timestamp": 1755772456,
  "cache_buster": "20250821-063358",
  "message": "Server running - cache_buster: 20250821-063358"
}
```

## How It Works

1. **Server Startup**: `start_servers.sh` runs `update_cache_busters.py`
2. **File Updates**: All `?v=` parameters updated with new timestamp
3. **Browser Detection**: `auto-cache-buster.js` detects cache buster changes
4. **Auto Refresh**: Browser automatically refreshes when new cache buster detected
5. **Health Monitoring**: Periodic checks for server restarts

## Files Updated Automatically
- `static/index.html` - All script/link version parameters
- `static/js/main.js` - Import version parameters  
- Cache invalidation timestamps and comments

## Benefits
- ✅ **No more manual cache clearing**
- ✅ **Automatic browser refresh on server restart**
- ✅ **Unique timestamps prevent cache conflicts**
- ✅ **Works across all browsers**
- ✅ **Preserves essential localStorage data**

## Cache Buster Format
`YYYYMMDD-HHMMSS` (e.g., `20250821-063358`)

## Troubleshooting

### Old servers still running
```bash
pkill -f 'python3 -m http.server'
pkill -f 'chat_service.py'
```

### Force manual refresh
1. Delete `static/.cache-buster`
2. Run `./start_servers.sh`
3. Hard refresh browser (Ctrl+Shift+R)

## Integration
The system is now integrated into the main startup flow. Simply use `./start_servers.sh` instead of manually starting servers to get automatic cache busting.