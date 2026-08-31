/**
 * useLeads.ts — Custom Hook
 *
 * This hook is the "brain" of the leads feature.
 * It connects the WebSocket service to React state so the UI
 * automatically re-renders whenever a new lead arrives.
 *
 * ─────────────────────────────────────────────────────────────────
 * MERN analogy:
 *   In a MERN app you might do useEffect(() => { socket.on('message', ...) })
 *   This is exactly the same pattern — React hook + event listener.
 * ─────────────────────────────────────────────────────────────────
 *
 * What this hook does:
 *   1. On mount → connects to the WebSocket server
 *   2. Listens for NEW_LEAD messages → prepends lead to the list
 *   3. Tracks connection status for the UI indicator
 *   4. On unmount → cleans up listeners (but keeps connection alive)
 *
 * Returns: { leads, status, clearLeads }
 */

import { useState, useEffect, useCallback } from 'react';

import * as WebSocketService from '@/services/websocket';
import type { Lead, ConnectionStatus } from '@/features/leads/types';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    // ── 1. Connect to the WebSocket server ──────────────────────────
    // connect() is safe to call multiple times — it's a no-op if already connected
    WebSocketService.connect();

    // Sync the initial status (might already be connected if the hook
    // was used before on this session)
    setStatus(WebSocketService.getStatus());

    // ── 2. Subscribe to incoming messages ───────────────────────────
    // onMessage returns an unsubscribe function — we call it in cleanup
    const unsubscribeMessages = WebSocketService.onMessage((message) => {
      if (message.type === 'NEW_LEAD') {
        // Prepend the new lead so it appears at the TOP of the list
        // Using functional update form ensures we always have the latest state
        setLeads((prevLeads) => [message.data, ...prevLeads]);
      }
    });

    // ── 3. Subscribe to connection status changes ───────────────────
    const unsubscribeStatus = WebSocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // ── 4. Cleanup on unmount ───────────────────────────────────────
    // We ONLY remove the listeners, not disconnect.
    // The WebSocket connection stays alive even when this component unmounts
    // (e.g. user navigates to another screen briefly) so we don't miss leads.
    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, []); // empty array = run once on mount, cleanup once on unmount

  /**
   * Clears all leads from the list (in-memory only, server is unaffected).
   * Useful for a "clear all" button in the UI.
   */
  const clearLeads = useCallback(() => {
    setLeads([]);
  }, []);

  return { leads, status, clearLeads };
}
