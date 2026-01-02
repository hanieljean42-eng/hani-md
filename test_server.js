const express = require('express');
const path = require('path');
const app = express();

app.use('/premium', express.static(path.join(__dirname, 'web', 'public')));

app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server works!' });
});

const server = app.listen(3001, '0.0.0.0', () => {
  console.log('[TEST] Server running on port 3001');
  console.log('[TEST] Premium: http://localhost:3001/premium/');
  console.log('[TEST] Test: http://localhost:3001/test');
});

// Keep server alive
server.on('error', (err) => {
  console.log('[ERROR] Server error:', err.message);
});

process.on('SIGINT', () => {
  console.log('[TEST] Shutting down...');
  process.exit(0);
});
