const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9101;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.onnx': 'application/octet-stream',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    let filePath = '.' + req.url;

    // Handle model files from parent directory
    if (req.url.startsWith('/models/')) {
        const modelName = path.basename(req.url);
        filePath = path.join(__dirname, '..', modelName);
        console.log(`Serving model: ${filePath}`);
    } else if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`
┌─────────────────────────────────────────────────────────┐
│  🔒 zkML ONNX Verifier UI                               │
├─────────────────────────────────────────────────────────┤
│  Port:         ${PORT}                                      │
│  URL:          http://localhost:${PORT}                   │
│  Backend:      http://localhost:9100                    │
├─────────────────────────────────────────────────────────┤
│  Ready to verify fraud detection models!                │
└─────────────────────────────────────────────────────────┘
`);
});
