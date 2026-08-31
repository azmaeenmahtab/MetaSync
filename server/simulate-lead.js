/**
 * simulate-lead.js — Test helper to simulate Meta Lead Ad Webhook payload
 *
 * Usage:
 *   node simulate-lead.js
 *
 * This sends a mock Meta webhook POST request to your local server at http://localhost:3001/webhook/meta
 * exactly in the structure that Meta's Lead Testing Tool sends.
 */

const http = require('http');

const mockLeadgenId = 'test_lead_' + Math.floor(100000 + Math.random() * 900000);
const payload = JSON.stringify({
  object: 'page',
  entry: [
    {
      id: 'PAGE_123456789',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: mockLeadgenId,
            page_id: 'PAGE_123456789',
            form_id: 'FORM_987654321',
            created_time: Math.floor(Date.now() / 1000),
          },
        },
      ],
    },
  ],
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3001,
    path: '/webhook/meta',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.log(`[Simulator] Status: ${res.statusCode}`);
      console.log(`[Simulator] Response: ${responseData}`);
      console.log(`[Simulator] ✅ Sent lead event with ID: ${mockLeadgenId}`);
    });
  }
);

req.on('error', (e) => {
  console.error(`[Simulator] ❌ Error sending test lead: ${e.message}`);
  console.error('[Simulator] Make sure the backend server is running on port 3001 (node index.js)');
});

req.write(payload);
req.end();
