#!/usr/bin/env python3
import http.server
import socketserver
from datetime import datetime

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache-control headers to prevent caching
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Add timestamp to show when served
        self.send_header('X-Served-At', datetime.now().isoformat())
        super().end_headers()
    
    def log_message(self, format, *args):
        # Add timestamp to log messages
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")

PORT = 8000
Handler = NoCacheHTTPRequestHandler

print(f"🚀 Starting NO-CACHE HTTP server on port {PORT}")
print(f"📁 Serving from: /home/hshadab/agentkit/static")
print(f"🚫 Cache-Control: no-cache, no-store, must-revalidate")
print(f"✅ All content will be fresh!")

import os
os.chdir('/home/hshadab/agentkit/static')

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🌐 Server running at http://localhost:{PORT}/")
    httpd.serve_forever()