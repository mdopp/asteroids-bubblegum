const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === '.') filePath = './index.html';
    const ext = path.extname(filePath);
    const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[ext] || 'application/octet-stream';
    fs.readFile(path.join(__dirname, filePath), (error, content) => {
        if (error) { res.writeHead(404); res.end('File not found'); }
        else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content); }
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
    
    // Test immediately after server starts
    http.get('http://localhost:3000/index.html', (res) => {
        let data = '';
        res.on('data', (chunk) => {
            console.log('CHUNK:', chunk.toString());
            data += chunk;
        });
        res.on('end', () => {
            console.log('FULL RESPONSE:', data);
            process.exit(0);
        });
    }).on('error', (e) => {
        console.error('ERROR:', e.message);
        process.exit(1);
    });
});
