// backend/src/config/config.js
// Centralised place for backend hardcoded config values.

export const DEFAULT_PORT = 5000;

// Max request body size accepted for JSON / urlencoded payloads
export const REQUEST_BODY_LIMIT = '100mb';

// --- Logging ---
export const LOG_DIR_NAME = 'logs';
export const SERVER_LOG_FILE = 'server.log';
export const CLIENT_LOG_FILE = 'client.log';
export const EXTRACTED_TEXT_LOG_FILE = 'extracted_text.log';

// --- AI Fallback (Ollama) ---
export const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';
export const OLLAMA_MODEL = 'qwen2.5-coder:1.5b';
export const OLLAMA_TEMPERATURE = 0.0;

// Contract text sent to the AI fallback is truncated to this many
// characters before being included in the prompt.
export const AI_FALLBACK_TEXT_LIMIT = 3000;

// --- Database Column Mapping ---
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
