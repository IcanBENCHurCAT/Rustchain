#!/usr/bin/env python3
"""
Minimal static file server for MapSnap frontend.
Serve on port 8080, with CORS headers for API calls.

Usage:
    python3 serve.py                  # localhost:8080
    python3 serve.py --port 3000      # custom port
"""
import argparse
import http.server
import socketserver

class Handler(http.server.SimpleHTTPRequestHandler):
    """Static file server with CORS headers."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.end_headers()

    def log_message(self, format, *args):
        """Quiet logging."""
        pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='MapSnap static server')
    parser.add_argument('--port', type=int, default=8080, help='Port to listen on')
    args = parser.parse_args()

    with socketserver.TCPServer(('0.0.0.0', args.port), Handler) as httpd:
        print(f'MapSnap frontend served at http://0.0.0.0:{args.port}')
        httpd.serve_forever()
