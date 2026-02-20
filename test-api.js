const http = require('http');

const data = JSON.stringify({
  name: "API Final Test",
  location: "Test Location",
  description: "testing mapUrl",
  latitude: "0",
  longitude: "0",
  mapUrl: "https://maps.app.goo.gl/NvCy6qoRZr4squy49?g_st=ic"
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 5000,
    path: '/api/places',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      // Mocking auth since the strictLimiter might skip or we need to bypass auth
      // Usually isAuthenticated middleware checks for req.isAuthenticated() which uses passport.
      // But let's just test if we can hit it.
    }
  },
  (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log(res.statusCode, raw));
  }
);
req.on('error', e => console.error(e));
req.write(data);
req.end();
