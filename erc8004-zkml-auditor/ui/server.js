/**
 * zkML Agent Auditor UI Server
 * Serves the dashboard on port 9003
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.UI_PORT || 9003;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
    // Parse URL and remove query string
    let urlPath = req.url.split('?')[0];

    // Default to index.html
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    // Build file path
    let filePath = path.join(__dirname, urlPath);

    // Security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return;
    }

    // Get content type
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                console.log(`❌ 404: ${urlPath}`);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                console.error(`❌ 500: ${err.message}`);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
            });
            res.end(content);
            console.log(`✅ ${req.method} ${urlPath} - ${contentType}`);
        }
    });
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 zkML Agent Auditor Dashboard');
    console.log('='.repeat(60));
    console.log(`\n📡 Server Information:`);
    console.log(`   Port: ${PORT}`);
    console.log(`   URL:  http://localhost:${PORT}`);
    console.log(`\n📋 Prerequisites:`);
    console.log(`   ✓ Backend API on port 9002`);
    console.log(`   ✓ JOLT-Atlas proof service on port 9001`);
    console.log(`   ✓ MetaMask with Base Sepolia network`);
    console.log(`   ✓ Testnet USDC in wallet`);
    console.log(`\n📦 Deployed Contracts:`);
    console.log(`   Registry:  0xF86630d38fd30dE173A7548806e1f12522dC5E27`);
    console.log(`   Verifier:  0xf752509cb5af017f465B42053d41B730991c6624`);
    console.log(`   USDC:      0x036CbD53842c5426634e7929541eC2318f3dCF7e`);
    console.log(`\n🚀 Ready to accept connections...\n`);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use`);
        console.error(`   Try: lsof -ti:${PORT} | xargs kill -9\n`);
    } else {
        console.error('\n❌ Server error:', err.message, '\n');
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed\n');
        process.exit(0);
    });
});
