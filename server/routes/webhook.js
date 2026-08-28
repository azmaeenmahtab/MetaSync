/**
 * webhook.js  (Express Router)
 *
 * This file handles all requests to the /webhook/meta route.
 *
 * Two endpoints:
 *
 *  1. GET  /webhook/meta  → Meta calls this once to VERIFY your webhook URL is real.
 *                           You respond with hub.challenge to prove you own the server.
 *
 *  2. POST /webhook/meta  → Meta calls this every time a lead form is submitted.
 *                           We parse the lead data and broadcast it via WebSocket.
 */

const express = require("express");
const fetch = require("node-fetch");
const { broadcast } = require("../services/websocketServer");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /webhook/meta  —  Webhook Verification (one-time setup)
// ---------------------------------------------------------------------------
// When you register your webhook URL in Meta's dashboard, Meta sends a GET
// request with three query params:
//   hub.mode        = "subscribe"
//   hub.verify_token = the token you set in Meta dashboard (must match .env)
//   hub.challenge    = a random string Meta wants you to echo back
//
// If the tokens match → respond with hub.challenge → Meta marks webhook as verified ✅
// ---------------------------------------------------------------------------
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[Webhook] Verification request received");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[Webhook] ✅ Verified successfully");
    // Echo the challenge back — this proves to Meta we own this server
    return res.status(200).send(challenge);
  }

  console.warn("[Webhook] ❌ Verification failed — token mismatch");
  return res.status(403).json({ error: "Verification failed" });
});

// ---------------------------------------------------------------------------
// POST /webhook/meta  —  Receive Lead Events
// ---------------------------------------------------------------------------
// Meta sends a POST body like this (simplified):
// {
//   "object": "page",
//   "entry": [{
//     "id": "PAGE_ID",
//     "time": 1234567890,
//     "changes": [{
//       "field": "leadgen",
//       "value": {
//         "leadgen_id": "LEAD_ID",
//         "page_id":    "PAGE_ID",
//         "form_id":    "FORM_ID",
//         "created_time": 1234567890
//       }
//     }]
//   }]
// }
//
// After parsing the IDs, we optionally call Meta's Graph API to get the
// actual field values (name, email, phone) the user filled in.
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const body = req.body;

  console.log("[Webhook] POST received:", JSON.stringify(body, null, 2));

  // Meta only sends leadgen events on "page" objects
  if (body.object !== "page") {
    return res.status(200).send("EVENT_RECEIVED");
  }

  // Loop through entries (usually just one)
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      // We only care about leadgen field changes
      if (change.field !== "leadgen") continue;

      const value = change.value;
      const leadgenId = value.leadgen_id;
      const pageId = value.page_id;
      const formId = value.form_id;
      const createdTime = value.created_time;

      console.log(`[Webhook] New lead! leadgen_id=${leadgenId}`);

      // Try to fetch actual lead field data from Meta's Graph API
      // (name, email, phone that the user typed in the form)
      const leadDetails = await fetchLeadDetails(leadgenId);

      // Build a clean lead object for the app
      const lead = {
        id: leadgenId,
        pageId,
        formId,
        // Spread the fetched fields (name, email, phone) or use mock data
        ...leadDetails,
        receivedAt: new Date().toISOString(),
      };

      // 🚀 Push to all connected React Native apps via WebSocket
      broadcast(lead);
    }
  }

  // Always respond 200 quickly — Meta will retry if you don't
  return res.status(200).send("EVENT_RECEIVED");
});

// ---------------------------------------------------------------------------
// Helper: Fetch Lead Details from Meta Graph API
// ---------------------------------------------------------------------------
// Calls: GET https://graph.facebook.com/{leadgen_id}?fields=field_data&access_token=...
//
// Returns an object like: { name: "John", email: "john@example.com", phone: "..." }
// Falls back to mock data if the token isn't configured or the call fails.
// ---------------------------------------------------------------------------
async function fetchLeadDetails(leadgenId) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  // If no token is configured, return realistic-looking mock data
  if (!accessToken || accessToken === "your_page_access_token_here") {
    console.warn("[Webhook] No access token configured — using mock lead data");
    return generateMockLeadData(leadgenId);
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("[Webhook] Graph API error:", data.error.message);
      return generateMockLeadData(leadgenId);
    }

    // field_data is an array like:
    // [{ name: "full_name", values: ["John Doe"] }, { name: "email", values: ["john@example.com"] }]
    const fields = {};
    for (const field of data.field_data || []) {
      fields[field.name] = field.values?.[0] ?? "";
    }

    return {
      name: fields["full_name"] || fields["first_name"] || "Unknown",
      email: fields["email"] || "",
      phone: fields["phone_number"] || "",
    };
  } catch (err) {
    console.error("[Webhook] Failed to fetch lead details:", err.message);
    return generateMockLeadData(leadgenId);
  }
}

// ---------------------------------------------------------------------------
// Helper: Generate Mock Lead Data (used when no access token is available)
// ---------------------------------------------------------------------------
// For the PoC demo, this gives us realistic-looking data even without a token.
// We use the last 4 digits of the leadgen_id to pick from sample arrays so
// repeated test submissions produce different results.
// ---------------------------------------------------------------------------
function generateMockLeadData(leadgenId) {
  const names = [
    "Alice Johnson",
    "Bob Smith",
    "Carlos Rivera",
    "Diana Patel",
    "Ethan Williams",
    "Fatima Khan",
  ];
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com"];

  // Use end of leadgen_id as a seed index
  const seed = parseInt(String(leadgenId).slice(-2), 10) || 0;
  const name = names[seed % names.length];
  const domain = domains[seed % domains.length];
  const emailPrefix = name.split(" ")[0].toLowerCase();

  return {
    name,
    email: `${emailPrefix}@${domain}`,
    phone: `+1 (555) ${String(Math.floor(1000 + (seed * 37) % 9000)).slice(0, 3)}-${String(1000 + (seed * 73) % 9000).slice(0, 4)}`,
  };
}

module.exports = router;
