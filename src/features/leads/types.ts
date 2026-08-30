/**
 * types.ts — Lead feature types
 *
 * This file defines the "shape" of a Lead object.
 * TypeScript types are like contracts — they tell every other file
 * exactly what fields a Lead has, so you get autocomplete + error checking.
 *
 * MERN analogy: Like a Mongoose schema, but just for TypeScript (no DB).
 */

/**
 * A single lead captured from a Meta Lead Ad form.
 * This is what the server broadcasts and the app displays.
 */
export interface Lead {
  /** Unique ID from Meta (the leadgen_id) */
  id: string;

  /** The person's full name (from the form field, or generated mock) */
  name: string;

  /** The person's email address */
  email: string;

  /** The person's phone number */
  phone: string;

  /** Meta Page ID the lead came from */
  pageId: string;

  /** Meta Lead Form ID */
  formId: string;

  /** ISO timestamp string of when the server received the lead */
  receivedAt: string;
}

/**
 * The shape of every WebSocket message we receive from the server.
 *
 * Every message has a `type` field so the app knows what to do with it.
 * This is a discriminated union — TypeScript will narrow the type based on `type`.
 *
 * Two message types we care about:
 *  - CONNECTED  → server confirms our WebSocket connection is established
 *  - NEW_LEAD   → a new lead just arrived, `data` contains the Lead object
 */
export type WebSocketMessage =
  | { type: 'CONNECTED'; message: string }
  | { type: 'NEW_LEAD'; data: Lead };

/**
 * Possible states of the WebSocket connection.
 * Used in the UI to show a connection status indicator.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
