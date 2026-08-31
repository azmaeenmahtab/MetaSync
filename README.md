# MetaSync — Meta Lead Ads + React Native Real-Time PoC

> A real-time Proof of Concept demonstrating instant Meta Lead Ad form synchronization to an active React Native app screen without any manual refresh or device interaction.

---

## 📌 Architecture & How It Works

### High-Level Flow
```text
┌───────────────────────────────────────┐
│     Meta Lead Testing Tool / Ad       │
└──────────────────┬────────────────────┘
                   │ 1. Form submitted (leadgen event)
                   ▼
┌───────────────────────────────────────┐
│     ngrok Public Tunnel               │ (https://xxxx.ngrok-free.app)
└──────────────────┬────────────────────┘
                   │ 2. Forwarded to local server
                   ▼
┌───────────────────────────────────────┐
│     Node.js / Express Webhook         │ (HTTP Port: 3001)
│     POST /webhook/meta                │
└──────────────────┬────────────────────┘
                   │ 3. Parse lead details (Graph API / Fallback)
                   ▼
┌───────────────────────────────────────┐
│     WebSocket Server (ws)             │ (WS Port: 3002)
│     broadcast({ type: 'NEW_LEAD' })   │
└──────────────────┬────────────────────┘
                   │ 4. Real-time push over persistent socket
                   ▼
┌───────────────────────────────────────┐
│     React Native (Expo App)           │
│     useLeads Hook -> Live UI Update   │
└───────────────────────────────────────┘
```

---

## 🏗️ Project Structure

The project maintains a clean, **feature-based** architecture in the frontend and a **modular service-based** architecture in the backend:

```text
MetaSync/
├── server/                                # Backend Server
│   ├── package.json
│   ├── .env.example                       # Environment template
│   ├── index.js                           # Entry point (HTTP + WebSocket server)
│   ├── routes/
│   │   └── webhook.js                     # Meta GET (verification) & POST (lead ingest)
│   ├── services/
│   │   └── websocketServer.js             # WebSocket connection & broadcast manager
│   └── simulate-lead.js                   # Local webhook test script
│
├── src/                                   # React Native App (Expo Router)
│   ├── app/
│   │   ├── _layout.tsx                    # Root navigation & theme provider
│   │   └── index.tsx                      # Entry screen mounting LeadsListScreen
│   ├── features/
│   │   └── leads/                         # Leads Feature Module
│   │       ├── components/
│   │       │   ├── LeadCard.tsx           # Individual animated lead card component
│   │       │   └── LeadsListScreen.tsx    # Live leads list view with status indicator
│   │       ├── hooks/
│   │       │   └── useLeads.ts            # Custom hook bridging WebSocket & React state
│   │       └── types.ts                   # TypeScript interfaces (Lead, WS Messages)
│   ├── services/
│   │   └── websocket.ts                   # Singleton WebSocket client with auto-reconnect
│   ├── constants/
│   │   └── theme.ts                       # Typography, color tokens, spacing
│   └── hooks/
│       └── use-color-scheme.ts            # Light / Dark theme support
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/go) app on physical mobile device or iOS/Android Simulator
- [ngrok](https://ngrok.com/) installed (`npm install -g ngrok` or downloaded binary)
- Meta Developer Account & Facebook Page with Lead Form setup

---

### Step 1: Start the Backend Server
```bash
cd server
npm install
cp .env.example .env
```
Fill in your credentials in `server/.env`:
```env
WEBHOOK_VERIFY_TOKEN=my_secret_verify_token
META_PAGE_ACCESS_TOKEN=your_page_access_token_here
HTTP_PORT=3001
WS_PORT=3002
```
Start the server:
```bash
node index.js
```

---

### Step 2: Expose Localhost with ngrok
In a separate terminal:
```bash
ngrok http 3001
```
Copy the forwarding HTTPS URL (e.g. `https://abc123.ngrok-free.app`).

---

### Step 3: Configure Meta Webhooks
1. Open [Meta for Developers](https://developers.facebook.com/) -> Select your App.
2. Under **Webhooks**, select **Page** from the dropdown and click **Subscribe to this object**.
3. **Callback URL**: `https://<your-ngrok-domain>/webhook/meta`
4. **Verify Token**: `my_secret_verify_token` (matches your `.env` value).
5. Click **Verify and Save**.
6. Under Subscription Fields, subscribe to **`leadgen`**.

---

### Step 4: Start the React Native App
From the project root:
```bash
npm install
npx expo start
```
- Open on **iOS Simulator**: press `i`
- Open on **Android Emulator**: press `a`
- Open on **Physical Device**: scan the QR code with the Expo Go app.
  *(Note: When testing on a physical phone, ensure your phone and computer are on the same Wi-Fi network and update `WS_HOST` in `src/services/websocket.ts` with your computer's local LAN IP).*

---

### Step 5: Test Real-Time Synchronization

#### Option A: Using Meta Lead Ads Testing Tool (Official)
1. Go to [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select your **Page** and **Form**.
3. Click **Create Lead**.
4. Observe the lead immediately appear in real-time on your mobile screen without touching the device.

#### Option B: Local Fast Simulator (Sanity Check)
Run the bundled simulation script to fire a mock Meta leadgen webhook payload:
```bash
cd server
npm run simulate
```

---

## 💡 Assumptions & Design Decisions

1. **In-Memory State for PoC**: For this Proof of Concept, leads are kept in memory on both the server and the mobile client for rapid real-time demonstration without requiring external database setup.
2. **WebSocket Real-Time Transport**: Standard native WebSockets provide persistent two-way communication with zero third-party client dependency overhead.
3. **Graceful Fallback for Graph API**: If a Page Access Token is expired or in sandbox test mode, the backend safely parses incoming lead IDs and formats clean lead payload representations so the demo remains resilient.
4. **Responsive Theme & Micro-Animations**: `LeadCard` components implement spring-based entry animations with dynamic dark/light mode support to provide a polished native user experience.

---

## 📹 Video Walkthroughs (Deliverables)

- **Video 1 (Demo - Max 5 mins)**: Demonstrates the React Native app running on device/simulator with the leads list open, triggering a test submission from Meta Lead Testing Tool, and showing the lead popping up automatically.
- **Video 2 (Code & Architecture)**: Explains the data flow, architecture layers, WebSocket lifecycle, and state synchronization.
