// ============================================================
// Verification Config
//
// Centralised place for the hardcoded values used by the Dashboard's
// "Date Verification" and "Verify Ministry/Department" table columns.
// Edit the values below to change validation behavior — no other
// file needs to change.
// ============================================================

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
// if ANY ONE of the three alternative rules below is met, based on
// their tenders' WO Values:
//   R1: at least R1_MIN_COUNT tenders each valued ABOVE R1_THRESHOLD
//   R2: at least R2_MIN_COUNT tenders each valued ABOVE R2_THRESHOLD
//   R3: at least R3_MIN_COUNT tenders each valued ABOVE R3_THRESHOLD
// Thresholds are plain INR amounts (1 Lakh = 100,000). Records with no
// vendor (single/multi-file uploads) are evaluated on their own, as a
// cohort of one. Separately, any individual WO Value below
// RULE_CHECK_R1_THRESHOLD is highlighted in red in the WO Value column.
export const RULE_CHECK_R1_MIN_COUNT = 3;
export const RULE_CHECK_R1_THRESHOLD = 422000; // 4.22 Lakhs

export const RULE_CHECK_R2_MIN_COUNT = 2;
export const RULE_CHECK_R2_THRESHOLD = 562000; // 5.62 Lakhs

export const RULE_CHECK_R3_MIN_COUNT = 1;
export const RULE_CHECK_R3_THRESHOLD = 720000; // 7.20 Lakhs

// --- Smart Page Router ---
// Pages that match ANY CONTRACT_SIGNALS entry are always processed.
// Pages with NO contract signals but at least one BOILERPLATE_SIGNALS
// entry are classified as legal boilerplate and skipped in the
// extraction loop. Pages that match neither list are kept (safe default).
// All matching is case-insensitive substring search.
export const PAGE_FILTER_CONTRACT_SIGNALS = [
  'GEMC-',
  'Contract Generated Date',
  'Total Contract Value Including',
  'अनुबंध क्रमांक',
  'Organisation Name',
  'Buyer Details',
  'Service Provider Details',
  'Consignee Details',
  'Ministry:',
  'Work Order Number',
  'Work Order No',
];

export const PAGE_FILTER_BOILERPLATE_SIGNALS = [
  'General Terms and Conditions',
  'Special Terms and Conditions',
  'Force Majeure',
  'Liquidated Damages',
  'Arbitration',
  'Indemnification',
  'Service Level Agreement',
  'Corrigendum',
  'Terms of delivery',
  'Performance Security',
  'Delivery Period',
];