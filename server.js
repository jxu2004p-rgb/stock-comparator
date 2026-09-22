const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/finance/')) {
    const symbol = decodeURIComponent(requestUrl.pathname.slice('/api/finance/'.length)).toUpperCase();
    if (!/^[A-Z0-9.\-^]{1,12}$/.test(symbol)) return send(res, 400, JSON.stringify({ error: 'Invalid symbol' }));
    try {
      const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d&events=history&includeAdjustedClose=true`;
      const upstream = await fetch(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0 Pairwise/1.0', Accept: 'application/json' } });
      const body = await upstream.text();
      return send(res, upstream.status, body);
    } catch (error) {
      return send(res, 502, JSON.stringify({ error: 'Market data is temporarily unavailable' }));
    }
  }

  const relative = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Pairwise is running at http://127.0.0.1:${PORT}`);
});
