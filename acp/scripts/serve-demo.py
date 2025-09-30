#!/usr/bin/env python3
"""
Simple HTTP server for demo UI
Serves static files from the static/ directory
"""

import http.server
import socketserver
import os

PORT = 9000
DIRECTORY = "static"

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"\n🌐 Demo UI Server running on port {PORT}")
        print(f"📂 Serving from: {os.path.join(os.getcwd(), DIRECTORY)}")
        print(f"\n🔗 Open: http://localhost:{PORT}/index.html\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")
            httpd.shutdown()