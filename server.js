const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;

const types = {
    '.html': 'text/html; charset=utf-8', 
    '.css': 'text/css; charset=utf-8', 
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', 
    '.png': 'image/png', 
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
    const cleanUrl = req.url.split('?')[0];
    let fp = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);
    const ext = path.extname(fp).toLowerCase();
    
    fs.readFile(fp, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': types[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`GOZ PRO Server running on http://localhost:${PORT}`);
});
