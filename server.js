// server.js — SlimDrop 本地開發伺服器
//
// 用途：設定 ffmpeg.wasm 必要的兩個 HTTP 標頭
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: credentialless
//
// 沒有這兩個標頭，瀏覽器會關閉 SharedArrayBuffer，
// ffmpeg.wasm 就無法執行。
//
// 啟動方式：node server.js
// 然後開啟瀏覽器：http://localhost:8080

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8080;

// 副檔名 → MIME 類型對照表
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
    '.ico':  'image/x-icon',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.json': 'application/json',
};

http.createServer((req, res) => {

    // ★ 關鍵：補上跨來源隔離標頭，讓瀏覽器開放 SharedArrayBuffer
    //   COOP same-origin：防止其他頁面取得此視窗的參考
    //   COEP credentialless：允許跨域 CDN 資源（unpkg, cdnjs），
    //                        比 require-corp 寬鬆，不需要對方設定 CORP 標頭
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

    // 解析 URL，去掉 query string，預設對應 index.html
    const urlPath  = req.url.split('?')[0];
    const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + urlPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
        });
        res.end(data);
    });

}).listen(PORT, () => {
    console.log('');
    console.log('  SlimDrop 開發伺服器已啟動');
    console.log('');
    console.log('  瀏覽器開啟：http://localhost:' + PORT);
    console.log('  已啟用 COOP + COEP，SharedArrayBuffer 可用');
    console.log('');
    console.log('  按 Ctrl+C 停止伺服器');
    console.log('');
});
