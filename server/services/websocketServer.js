/**
 * websocketServer.js
 *
 * Manages all WebSocket connections from the React Native app.
 *
 * Think of this like a "chat room manager":
 *   - When the RN app opens, it connects here (joins the room)
 *   - When the RN app closes, it disconnects (leaves the room)
 *   - When a new lead arrives, we broadcast it to everyone in the room
 *
 * We use the `ws` package — the most popular WebSocket library for Node.js.
 */

const { WebSocketServer, WebSocket } = require("ws");

// We store all active connections in a Set (like an array but automatically handles duplicates)
const clients = new Set();

let wss = null;

/**
 * Creates and starts the WebSocket server.
 * Can attach directly to an HTTP server (sharing port 3001) or listen on a standalone port.
 */
function createWebSocketServer(serverOrPort) {
  if (typeof serverOrPort === "number" || typeof serverOrPort === "string") {
    wss = new WebSocketServer({ port: Number(serverOrPort) });
    wss.on("listening", () => {
      console.log(`[WebSocket] Server listening on ws://localhost:${serverOrPort}`);
    });
  } else {
    // Attached to existing HTTP server (e.g. port 3001)
    wss = new WebSocketServer({ server: serverOrPort });
    console.log(`[WebSocket] Server attached to HTTP server`);
  }

  // This fires every time a new client (our RN app) connects
  wss.on("connection", (socket) => {
    console.log(`[WebSocket] New client connected. Total clients: ${clients.size + 1}`);

    // Add this new connection to our set
    clients.add(socket);

    // Send a welcome message so the app knows it's connected
    socket.send(
      JSON.stringify({
        type: "CONNECTED",
        message: "Connected to Meta Leads server",
      })
    );

    // This fires when the client sends us a message (we don't expect any, but good to log)
    socket.on("message", (data) => {
      console.log(`[WebSocket] Message from client: ${data}`);
    });

    // This fires when the client disconnects (app closed, network drop, etc.)
    socket.on("close", () => {
      clients.delete(socket);
      console.log(`[WebSocket] Client disconnected. Total clients: ${clients.size}`);
    });

    // Handle any socket-level errors gracefully
    socket.on("error", (err) => {
      console.error("[WebSocket] Socket error:", err.message);
      clients.delete(socket);
    });
  });

  wss.on("error", (err) => {
    console.error("[WebSocket] Server error:", err.message);
  });

  return wss;
}

/**
 * Broadcasts a lead object to ALL connected React Native app instances.
 *
 * This is called by the webhook route the moment a new lead arrives.
 * It loops through every connected client and sends them the JSON message.
 */
function broadcast(lead) {
  const message = JSON.stringify({
    type: "NEW_LEAD",
    data: lead,
  });

  let sentCount = 0;

  clients.forEach((client) => {
    // Only send to clients that are still open (OPEN = 1)
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });

  console.log(`[WebSocket] Broadcasted new lead to ${sentCount} client(s)`);
}

module.exports = { createWebSocketServer, broadcast };
