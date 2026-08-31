/**
 * websocket.ts — WebSocket Client Service
 *
 * This is the React Native side of the real-time connection.
 * It manages a single WebSocket connection to our backend server.
 *
 * ─────────────────────────────────────────────────────────────────
 * WHY A SINGLETON SERVICE?
 * ─────────────────────────────────────────────────────────────────
 * We want only ONE WebSocket connection for the entire app lifetime,
 * no matter how many screens or components are mounted.
 *
 * If every component created its own connection, we'd get duplicate
 * leads showing up and waste resources.
 *
 * MERN analogy: Like a single mongoose.connect() call in your server.js —
 * you call it once, then every model in your app reuses that connection.
 *
 * ─────────────────────────────────────────────────────────────────
 * HOW TO USE THIS SERVICE
 * ─────────────────────────────────────────────────────────────────
 * 1. Call connect() once when the app starts
 * 2. Register listeners with onMessage() to react to new leads
 * 3. Call disconnect() when the app goes to background (optional)
 *
 * The actual hook (useLeads.ts) handles all of this — you won't
 * call this service directly from a component.
 * ─────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────
 * FINDING YOUR LOCAL IP (needed for physical device testing)
 * ─────────────────────────────────────────────────────────────────
 * On Windows: run `ipconfig` in cmd → look for "IPv4 Address"
 * On Mac:     run `ifconfig` in terminal → look for "inet" under en0
 *
 * Example: 192.168.1.105
 * Then WS_URL would be: ws://192.168.1.105:3002
 *
 * For iOS Simulator: ws://localhost:3002 works fine.
 * For Android Emulator: use ws://10.0.2.2:3002 (Android's alias for host machine)
 * ─────────────────────────────────────────────────────────────────
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { WebSocketMessage, ConnectionStatus } from '@/features/leads/types';

// ─────────────────────────────────────────────────────────────────
// CONFIG — WebSocket server address
// ─────────────────────────────────────────────────────────────────
// Auto-detect the machine's IP address when running via Expo Go on physical device:
// Expo hostUri format is "192.168.1.107:8081" -> extracts "192.168.1.107"
function getDevServerHost(): string {
  // If running in browser (Expo Web) or iOS simulator
  if (Platform.OS === 'web' || Platform.OS === 'ios') {
    return typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
  }

  // Physical Device / Expo Go auto-detection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && !host.includes('.exp.') && !host.includes('tunnel')) {
      return host;
    }
  }

  // Fallback for Android emulator / physical device on same Wi-Fi
  return '192.168.0.101';
}

const WS_HOST = getDevServerHost();
const WS_PORT = 3001; // Shared with HTTP server
const WS_URL = `ws://${WS_HOST}:${WS_PORT}`;

// How long to wait before trying to reconnect after a disconnect (ms)
const RECONNECT_DELAY_MS = 3000;

// ─────────────────────────────────────────────────────────────────
// Internal state — all private to this module (singleton)
// ─────────────────────────────────────────────────────────────────
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = true; // set to false when user intentionally disconnects

// Registry of callbacks: any part of the app can subscribe to messages
const messageListeners = new Set<(message: WebSocketMessage) => void>();

// Registry of callbacks for connection status changes
const statusListeners = new Set<(status: ConnectionStatus) => void>();

// ─────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────

function notifyStatus(status: ConnectionStatus) {
  statusListeners.forEach((listener) => listener(status));
}

function scheduleReconnect() {
  if (!shouldReconnect) return;
  if (reconnectTimer) return; // already scheduled

  console.log(`[WebSocket Client] Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────

/**
 * Opens the WebSocket connection to the backend server.
 * Safe to call multiple times — it won't create duplicate connections.
 */
export function connect() {
  // Don't open another connection if one is already open or connecting
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  shouldReconnect = true;
  console.log(`[WebSocket Client] Connecting to ${WS_URL}`);
  notifyStatus('connecting');

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WebSocket Client] ✅ Connected');
    notifyStatus('connected');
  };

  socket.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data as string);
      console.log('[WebSocket Client] Message received:', message.type);

      // Notify all registered listeners (e.g. useLeads hook)
      messageListeners.forEach((listener) => listener(message));
    } catch (err) {
      console.error('[WebSocket Client] Failed to parse message:', event.data);
    }
  };

  socket.onclose = (event) => {
    console.log(`[WebSocket Client] Connection closed (code: ${event.code})`);
    socket = null;
    notifyStatus('disconnected');
    // Auto-reconnect unless the user explicitly called disconnect()
    scheduleReconnect();
  };

  socket.onerror = (error) => {
    console.error('[WebSocket Client] Error:', error);
    notifyStatus('error');
    // onclose will fire next and handle reconnection
  };
}

/**
 * Closes the WebSocket connection and disables auto-reconnect.
 * Call this when the app goes to background or unmounts.
 */
export function disconnect() {
  shouldReconnect = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  console.log('[WebSocket Client] Disconnected (manual)');
}

/**
 * Register a callback to receive WebSocket messages.
 * Returns an unsubscribe function — call it to stop listening.
 *
 * Usage:
 *   const unsubscribe = onMessage((msg) => { ... });
 *   // later:
 *   unsubscribe();
 */
export function onMessage(listener: (message: WebSocketMessage) => void): () => void {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

/**
 * Register a callback for connection status changes.
 * Returns an unsubscribe function.
 */
export function onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * Get the current connection status synchronously.
 */
export function getStatus(): ConnectionStatus {
  if (!socket) return 'disconnected';
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN:       return 'connected';
    default:                   return 'disconnected';
  }
}
