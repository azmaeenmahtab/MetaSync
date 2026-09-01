

require("dotenv").config();

const express = require("express");
const { createWebSocketServer } = require("./services/websocketServer");
const webhookRouter = require("./routes/webhook");


const HTTP_PORT = process.env.HTTP_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

const app = express();


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
// Start HTTP & WebSocket Server (shared port 3001)
// ---------------------------------------------------------------------------
const http = require("http");
const server = http.createServer(app);

// Attach WebSocket server to the same HTTP server
createWebSocketServer(server);

server.listen(HTTP_PORT, () => {
  console.log("=".repeat(50));
  console.log("  Meta Leads Server — RUNNING");
  console.log("=".repeat(50));
  console.log(`  HTTP (webhook)  → http://localhost:${HTTP_PORT}`);
  console.log(`  WS   (realtime) → ws://localhost:${HTTP_PORT}`);
  console.log(`  Health check    → http://localhost:${HTTP_PORT}/health`);
  console.log("=".repeat(50));
  console.log("  Next steps:");
  console.log("  1. Run: npx localtunnel --port 3001");
  console.log("  2. Register callback URL in Meta dashboard:");
  console.log("     https://<your-subdomain>.loca.lt/webhook/meta");
  console.log("=".repeat(50));
});
