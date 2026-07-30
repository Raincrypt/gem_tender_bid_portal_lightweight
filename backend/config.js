// backend/config.js
//
// Centralised place for the hardcoded values used by server.js.
// Edit the values below to change server behavior — no other file
// needs to change.
// ============================================================

// --- Server ---
// Falls back to this port if the PORT environment variable is unset.
export const DEFAULT_PORT = 5000;

// Max request body size accepted for JSON / urlencoded payloads
// (bulk-save requests can carry many records at once).
export const REQUEST_BODY_LIMIT = '100mb';

// --- Logging ---
export const LOG_DIR_NAME = 'logs';
export const SERVER_LOG_FILE = 'server.log';
export const CLIENT_LOG_FILE = 'client.log';
export const EXTRACTED_TEXT_LOG_FILE = 'extracted_text.log';

// --- AI Fallback (Ollama) ---
// Local Ollama server endpoint used when regex-based field extraction
// fails on a page.
export const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';
export const OLLAMA_MODEL = 'qwen2.5-coder:1.5b';
export const OLLAMA_TEMPERATURE = 0.0;

// Contract text sent to the AI fallback is truncated to this many
// characters before being included in the prompt.
export const AI_FALLBACK_TEXT_LIMIT = 3000;

// --- Database Column Mapping ---
// Maps the camelCase field names used by the frontend to the
// snake_case column names in the extracted_bids table, for the
// single-cell PUT /api/bids/:id update endpoint.
export const BID_FIELD_TO_COLUMN = {
  woNumber: 'wo_number',
  woValue: 'wo_value',
  date: 'date_str',
  dateVerified: 'date_verified',
  ministry: 'ministry',
  ministryVerified: 'ministry_verified',
  completionCertificate: 'completion_certificate',
  recommendation: 'recommendation',
};
