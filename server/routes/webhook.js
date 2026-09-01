

const express = require("express");
const fetch = require("node-fetch");
const { broadcast } = require("../services/websocketServer");

const router = express.Router();


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
