/**
 * Keep-alive script to prevent the API server from sleeping on free tiers.
 * This should ping your server URL every 14 minutes.
 */

const https = require('https');

const SERVER_URL = process.env.SERVER_URL || 'https://YOUR-APP-NAME.onrender.com/health'; // Update this!

console.log(`Starting keep-alive for: ${SERVER_URL}`);

function ping() {
  https.get(SERVER_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Ping status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Ping failed:`, err.message);
  });
}

// Ping immediately on start
ping();

// Keep running if used as a persistent process (optional)
setInterval(ping, 14 * 60 * 1000); // 14 minutes
