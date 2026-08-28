/**
 * index.js  —  Server Entry Point
 *
 * This is where everything starts. It:
 *   1. Loads environment variables from .env
 *   2. Creates an Express HTTP server (handles webhook calls from Meta)
 *   3. Creates a WebSocket server (pushes leads to the React Native app)
 *   4. Connects the webhook route
 *   5. Starts listening
 *
 * MERN analogy: This is like your server.js or app.js in an Express/Node backend.
 */

require("dotenv").config();

const express = require("express");
const { createWebSocketServer } = require("./services/websocketServer");
const webhookRouter = require("./routes/webhook");

// ---------------------------------------------------------------------------
// Config — pulled from .env file (copy .env.example → .env and fill it in)
// ---------------------------------------------------------------------------
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// ---------------------------------------------------------------------------
// Express App Setup (handles webhook HTTP requests from Meta)
// ---------------------------------------------------------------------------
const app = express();

// Parse incoming JSON bodies (Meta sends JSON in webhook POST requests)
app.use(express.json());

// Health check endpoint — useful to confirm the server is running
// Visit http://localhost:3001/health in your browser to check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Meta Leads server is running",
    timestamp: new Date().toISOString(),
  });
});

// Register the webhook router at /webhook/meta
// So the full routes are:
//   GET  http://localhost:3001/webhook/meta  → verification
//   POST http://localhost:3001/webhook/meta  → new lead event
app.use("/webhook/meta", webhookRouter);

// Catch-all for unknown routes (helps with debugging)
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ---------------------------------------------------------------------------
// Start WebSocket Server (real-time channel to the React Native app)
// ---------------------------------------------------------------------------
createWebSocketServer(WS_PORT);

// ---------------------------------------------------------------------------
// Start HTTP Server (receives webhook calls from Meta via ngrok)
// ---------------------------------------------------------------------------
app.listen(HTTP_PORT, () => {
  console.log("=".repeat(50));
  console.log("  Meta Leads Server — RUNNING");
  console.log("=".repeat(50));
  console.log(`  HTTP  (webhook) → http://localhost:${HTTP_PORT}`);
  console.log(`  WS    (realtime) → ws://localhost:${WS_PORT}`);
  console.log(`  Health check     → http://localhost:${HTTP_PORT}/health`);
  console.log("=".repeat(50));
  console.log("  Next steps:");
  console.log("  1. Copy .env.example → .env and fill in your tokens");
  console.log("  2. Run: ngrok http 3001");
  console.log("  3. Register the ngrok URL in Meta dashboard");
  console.log("=".repeat(50));
});
