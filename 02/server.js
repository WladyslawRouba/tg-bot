const http = require('http');

const PORT = 3000;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const currentTime = new Date().toISOString();
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  switch (pathname) {
    case '/':
      sendJson(res, 200, {
        message: 'Welcome! This is a vanilla Node.js API.',
        endpoints: ['/', '/hello', '/time'],
        currentTime,
      });
      break;

    case '/hello':
      sendJson(res, 200, {
        message: 'Hello from vanilla Node.js!',
        currentTime,
      });
      break;

    case '/time':
      sendJson(res, 200, {
        message: 'Current server time',
        iso: currentTime,
        local: new Date().toString(),
        timestamp: Date.now(),
      });
      break;

    default:
      sendJson(res, 404, {
        message: 'Endpoint not found',
        currentTime,
      });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
