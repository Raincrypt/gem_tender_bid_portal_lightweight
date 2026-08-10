// ============================================================
// Verification Config
//
// Centralised place for the hardcoded values used by the Dashboard's
// "Date Verification" and "Verify Ministry/Department" table columns.
// Edit the values below to change validation behavior — no other
// file needs to change.
// ============================================================

// --- Backend API ---
// Root URL of the local Express/PostgreSQL backend. All API endpoint
// constants below are derived from this so the host/port only needs
// to change in one place.
export const API_ROOT_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  bids: `${API_ROOT_URL}/api/bids`,
  tenders: `${API_ROOT_URL}/api/tenders`,
  logClient: `${API_ROOT_URL}/api/log/client`,
  logExtractedText: `${API_ROOT_URL}/api/log/extracted-text`,
  extractFallback: `${API_ROOT_URL}/api/extract-fallback`,
};

// --- LocalStorage ---
// Key used to persist/restore the extracted data table when the
// PostgreSQL backend is unreachable.
export const LOCAL_STORAGE_HISTORY_KEY = 'gem_portal_history';
export const LOCAL_STORAGE_TENDERS_KEY = 'gem_portal_tenders';

// --- Bulk Save Behavior ---
// Number of records sent per POST /api/bids/bulk request when saving
// a large batch to PostgreSQL.
export const POSTGRES_CHUNK_SIZE = 100;

// Delay (ms) inserted between per-file processing steps during bulk
// folder upload, to keep the UI responsive.
export const BULK_PROCESS_THROTTLE_MS = 30;

// --- Date Verification ---
// A record's extracted date "passes" verification (shows "Yes") only
// if it falls on or after this cutoff date. Anything before this date,
// or a date that couldn't be parsed at all, shows "No".
// Format: new Date(year, monthIndex, day) — monthIndex is 0-based
// (0 = January, 11 = December).
export const DATE_VERIFICATION_CUTOFF = new Date(2019, 5, 1); // 1 Jun 2019

// --- Ministry / Department Verification ---
// The "WO for Petroleum/Petrochemical Refinery" column runs a two-tier
// check against an extracted ministry/organisation value:
//
//   Tier 1 — EXACT MATCH:
//     The extracted text must exactly match (case-insensitive, extra
//     whitespace ignored) one of the entries in VALID_MINISTRIES below.
//     Use this for names you always want to match in full and nothing
//     else.
//
//   Tier 2 — KEYWORD MATCH (fallback):
//     If no exact match is found, the extracted text is checked for
//     whether it *contains* any entry from VALID_MINISTRY_KEYWORDS
//     (case-insensitive substring search). This catches real-world
//     variants like "INDIAN OIL CORPORATION LIMITED, Haldia Refinery"
//     which wouldn't hit the exact list but clearly belongs (it
//     contains "indian oil" and "refinery").
//
// The record shows "Yes" if EITHER tier matches; "No" otherwise.
// Add new entries to whichever list makes sense — exact match for
// complete organisation names; keywords for broad industry terms or
// well-known abbreviations.

export const VALID_MINISTRIES = [
  'Refinery and Petrochemicals',
  'Refinery',
  'Petrochemicals',
  'IOCL',
  'Indian Oil Corporation Limited',
  'Bharat Petroleum Corporation Limited',
  'BPCL',
  'Hindustan Petroleum Corporation Limited',
  'HPCL',
  'Bharat Petroleum',
  'Hindustan Petroleum',
];

// --- Ministry Keyword Matching (Tier 2) ---
// If an extracted ministry/organisation value doesn't exactly match
// VALID_MINISTRIES, it is checked for whether it *contains* any of
// these keywords (case-insensitive substring). This catches real-world
// PDF extraction variants like:
//   "INDIAN OIL CORPORATION LIMITED, Haldia Refinery"  → hits "indian oil" + "refinery"
//   "Ministry of Petroleum and Natural Gas"             → hits "petroleum"
//   "HPCL Vizag Refinery"                               → hits "hpcl" + "refinery"
// Add new keywords here — no code changes needed.
export const VALID_MINISTRY_KEYWORDS = [
  // Industry terms — broadest catch
  'refinery',
  'refineries',
  'petroleum',
  'petrochemical',
  'petrochemicals',
  'natural gas',

  // Major Indian PSU oil company abbreviations
  'iocl',
  'bpcl',
  'hpcl',
  'ongc',
  'mrpl',   // Mangalore Refinery and Petrochemicals
  'cpcl',   // Chennai Petroleum Corporation
  'nrl',    // Numaligarh Refinery
  'borl',   // Bharat Oman Refineries
  'oil india',

  // Partial / common company name fragments PDF extraction may produce
  'indian oil',
  'bharat petroleum',
  'hindustan petroleum',
  'mangalore refinery',
  'chennai petroleum',
  'numaligarh',
  'oil corporation',
  'oil and natural gas',
];

// --- Display Formatting ---
// WO Value amounts are grouped using this locale's number formatting.
// 'en-IN' produces the Indian numbering system (e.g. 2,00,000 instead
// of 200,000).
export const CURRENCY_LOCALE = 'en-IN';

// Symbol prefixed to every formatted WO Value.
export const CURRENCY_SYMBOL = '₹';

// WO Date values are displayed in this format across the dashboard
// table and the exported Excel sheet. Supported tokens: DD, MM, YYYY.
export const DATE_DISPLAY_FORMAT = 'DD-MM-YYYY';

// --- WO Value Rule Check (Similar Works Eligibility) ---
// A vendor (grouped by Bidder's Name) satisfies this eligibility check
// if ANY ONE of the tiers below is met, based on their tenders' WO
// Values: at least `minCount` tenders each valued ABOVE `threshold`.
// Thresholds are plain INR amounts (1 Lakh = 100,000). Records with no
// vendor (single/multi-file uploads) are evaluated on their own, as a
// cohort of one. Separately, any individual WO Value below the R1
// tier's threshold is highlighted in red in the WO Value column.
// Add or remove tiers here — no code changes needed elsewhere.
export const RULE_CHECK_TIERS = [
  { id: 'R1', minCount: 3, threshold: 422000 }, // 4.22 Lakhs
  { id: 'R2', minCount: 2, threshold: 562000 }, // 5.62 Lakhs
  { id: 'R3', minCount: 1, threshold: 720000 }, // 7.20 Lakhs
];

// ============================================================
// PDF Field Extraction Patterns
//
// Regex patterns and thresholds used by the per-page contract field
// extraction pipeline in Dashboard.jsx. Moved here verbatim from
// inline literals — behavior and match order are unchanged; only the
// location and naming changed.
// ============================================================

// --- IOCL (Indian Oil) Document Detection ---
// A document is treated as the IOCL/Haldia Refinery "Work Order"
// format (single-record-per-file) if it contains any of these markers.
export const IOCL_DETECTION_MARKERS = ['INDIAN OIL', 'Haldia Refinery'];
// Additional condition: contains "Work Order" text but NOT "GEMC".
export const IOCL_WORK_ORDER_MARKER = 'Work Order';
export const IOCL_GEMC_EXCLUSION_MARKER = 'GEMC';

export const IOCL_DEFAULT_MINISTRY = 'INDIAN OIL CORPORATION LIMITED, Haldia Refinery';

export const IOCL_WO_NUMBER_PATTERN = /(?:Work Order Number|Work Order No|Work Order No\.|WO No|WO Number)[:\s]*([0-9/A-Z-]+)/i;

// Tried in order; first match wins.
export const IOCL_WO_VALUE_PATTERNS = [
  /Rs\.\s*([\d,]+(?:\.\d{1,2})?)\s*including GST/i,
  /Executed Value of the Contract:\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?\s*)([\d,]{5,}(?:\.\d{1,2})?)/i,
];
export const IOCL_WO_VALUE_FALLBACK_PATTERN = /[\d]{1,3}(?:,[\d]{2,3})+(?:\.[\d]{2})?/;

// Tried in order; first match wins.
export const IOCL_DATE_PATTERNS = [
  /(?:of Commencement|Date of Issue|WO Date)[:\s]*([0-9.]+)/i,
  /(?:Date|Dated)[:\s]*([0-9.]+)/i,
  /\d{2}\.\d{2}\.\d{4}/,
];

// --- Standard GeM Document Extraction ---
// A page starts a new contract record if it matches this pattern.
export const NEW_CONTRACT_START_PATTERN = /(?:Contract No|अनुबंध क्रमांक|GEMC|Work Order No|Sanction No|Order No|PO No|GEM[/])/i;

// Tried in order; first match wins. Capture group 1 is used when
// present, otherwise the full match (group 0).
export const WO_NUMBER_PATTERNS = [
  /GEMC\s*[-–—]?\s*[\w-]+/i,
  /GEM\s*[|/-]\s*\d+[|/A-Z0-9_-]+/i,
  /(?:Contract No|Work Order No|Order No|PO No|Sanction No|अनुबंध क्रमांक|GEM[- ]?No|Bid Number)[:\s|]*([A-Z0-9/_-]{5,})/i,
];
// Strips the label prefix left behind when the 3rd pattern's full
// match (rather than its capture group) is used.
export const WO_NUMBER_LABEL_STRIP_PATTERN = /^(?:Contract No|Work Order No|Order No|PO No|Sanction No|अनुबंध क्रमांक|GEM[- ]?No|Bid Number)[:\s|]*/i;

// Tried in order; first match with a digit in group 1 wins.
export const DATE_LABEL_PATTERNS = [
  /(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9]{2}-[A-Za-z]{3}-[0-9]{4})/i,
  /(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9]{2}[-/.]\d{2}[-/.]\d{4})/i,
  /(?:Contract Generated Date|अनुबंध तिथि|Dated|Date)[:\s\]|]*([0-9A-Za-z\-./]{10,12})/i,
];
// Used to locate a nearby date when the labeled patterns above fail.
export const DATE_ANCHOR_SEARCH_PATTERN = /(?:Generated Date|अनुबंध तिथि|Dated)/i;
// Width (characters) of the text window scanned after the date anchor.
export const DATE_FALLBACK_SNIPPET_WINDOW = 120;
// Tried in order within that window; first match wins.
export const DATE_FALLBACK_PATTERNS = [/\d{2}-[A-Za-z]{3}-\d{4}/, /\d{2}[-/.]\d{2}[-/.]\d{4}/];

// WO Value: tier 1 (primary label), tier 2 (secondary label), then a
// generic anchor + windowed fallback.
export const WO_VALUE_TIER1_PATTERN = /(?:Total\s*Contract\s*Value\s*Including\s*All\s*Duties\s*and\s*Taxes(?:\s*\(\s*INR\s*\))?|सभी\s*शुल्क\s*और\s*करों\s*सहित\s*कुल\s*अनुबंध\s*मूल्य)[:\s|]*([0-9](?:[0-9.,]|\s(?=[0-9.,]))*[0-9])/i;
export const WO_VALUE_TIER2_PATTERN = /(?:Total\s*Amount\s*Including\s*All\s*Duties\s*and\s*Taxes\s*in\s*INR)[:\s|]*([0-9](?:[0-9.,]|\s(?=[0-9.,]))*[0-9])/i;
// A tier match (or the windowed fallback digit string below) is only
// accepted if it has at least this many digit characters.
export const WO_VALUE_MIN_DIGIT_LENGTH = 4;
export const WO_VALUE_ANCHOR_SEARCH_PATTERN = /(?:Duties and Taxes|कुल अनुबंध मूल्य|Contract Value|Original Value|Total Amount|Order Value)/i;
// Width (characters) of the text window scanned after the value anchor.
export const WO_VALUE_CONTEXT_WINDOW = 200;
export const WO_VALUE_FALLBACK_PATTERN = /[0-9](?:[0-9,]|\s(?=[0-9,]))*(?:\s?\.\s?[0-9]+)?/;

// Ministry: tried in order; first match wins.
export const MINISTRY_PATTERNS = [
  /Ministry\s?of\s?([A-Za-z\s]{3,40})(?=\s?Department|\s?महानिदेशालय|\s?\||$)/i,
  /Ministry\s?of\s?([A-Za-z\s]{3,40})/i,
  /(?:Organization Details|संगठन विवरण|Buyer Details)[:\s|]*Ministry\s?of\s?([A-Za-z\s]{3,40})/i,
];
// Fallback when no "Ministry of ..." phrase is found.
export const ORGANISATION_NAME_PATTERN = /(?:Organisation Name|संगठन का नाम)[:\s|]*([A-Za-z\s]{4,40})(?=\s?Type|\||$)/i;

// Last-resort ministry inference, checked in this order (first match
// wins) when neither the "Ministry of ..." nor "Organisation Name"
// patterns above find anything. Add or remove rules here — no code
// changes needed elsewhere.
export const MINISTRY_KEYWORD_RULES = [
  { pattern: /Defence|Defense/i, ministry: 'Ministry of Defence' },
  { pattern: /Finance/i, ministry: 'Ministry of Finance' },
  { pattern: /Railways/i, ministry: 'Ministry of Railways' },
  { pattern: /Textiles/i, ministry: 'Ministry of Textiles' },
  { pattern: /Communications/i, ministry: 'Ministry of Communications' },
  { pattern: /Labour/i, ministry: 'Ministry of Labour and Employment' },
];