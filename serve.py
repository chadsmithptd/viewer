"""Minimal static file server for the FloorCast POC."""
import http.server, os, sys

PORT = int(os.environ.get('PORT', 8080))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args): pass  # quiet

print(f"FloorCast POC → http://localhost:{PORT}/poc/")
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
