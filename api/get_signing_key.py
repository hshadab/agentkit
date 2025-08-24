#!/usr/bin/env python3
"""
API endpoint to securely provide signing capabilities for Gateway workflow.
This avoids MetaMask confirmations by using the private key from environment.
"""
import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SigningKeyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/get-signing-key':
            # Get private key from environment
            private_key = os.getenv('PRIVATE_KEY')
            
            if not private_key:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Private key not configured'}).encode())
                return
            
            # Send private key (in production, use more secure methods)
            response = {
                'privateKey': private_key,
                'userAddress': '0xE616B2eC620621797030E0AB1BA38DA68D78351C'
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    port = 8002
    server = HTTPServer(('localhost', port), SigningKeyHandler)
    print(f'Signing key API running on port {port}')
    server.serve_forever()