/**
 * Channel suffix appended to async IPC channels for reply messages
 * Used internally to construct reply channel names for async operations
 */
export const ASYNC_REPLY_SUFFIX = '-ASYNC_REPLY';

/**
 * Maximum value for call ID generation to prevent collisions
 * Call IDs are used to track async operations and match responses
 */
export const MAX_CALL_ID = 100000;

/**
 * Default timeout values in milliseconds for various operations
 * @readonly
 */
export const TIMEOUTS = {
  /** Standard request timeout (30 seconds) */
  DEFAULT_REQUEST: 30000,
  /** Long-running operation timeout (5 minutes) */
  LONG_RUNNING: 300000,
} as const;

/**
 * Common error codes used across the IPC system for consistent error handling
 * @readonly
 */
export const ERROR_CODES = {
  /** Handler function not found for the requested channel */
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
  /** Invalid or malformed payload data */
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  /** Operation timed out */
  TIMEOUT: 'TIMEOUT',
  /** Electron API not available (preload script issue) */
  ELECTRON_API_NOT_FOUND: 'ELECTRON_API_NOT_FOUND',
} as const;