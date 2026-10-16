import http.server
import socketserver
import mimetypes

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')

class StrictMimeHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def guess_type(self, path):
        if str(path).endswith('.js') or str(path).endswith('.mjs'):
            return 'application/javascript'
        return super().guess_type(path)

PORT = 8000
socketserver.ThreadingTCPServer.allow_reuse_address = True

if __name__ == '__main__':
    with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), StrictMimeHandler) as httpd:
        print(f"DESCEND 6DOF Server active at http://127.0.0.1:{PORT} (JavaScript MIME enforced, Multi-threaded)", flush=True)
        httpd.serve_forever()
