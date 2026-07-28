# GeM Bid Portal — Contract Extraction & Verification Dashboard

A browser-based tool for extracting structured fields (WO Number, WO Value,
Date, Ministry/Department) from GeM (Government e-Marketplace) and PSU
work-order PDFs, verifying them against configurable business rules, and
exporting the results to Excel. All PDF parsing happens **client-side** in
the browser; a small Node/Express API persists the results to PostgreSQL.

> This README describes what the code in this repository actually does.
> An earlier version of this document described a different, more
> elaborate architecture (Docling, Ollama, local vision-language models,
> FastAPI, Docker Compose). None of that exists in this codebase — see
> **Analysis & Caveats** at the bottom for details.

---

## 1. What It Does

1. You upload one or more GeM/PSU contract PDFs (individually, or as a
   folder-per-vendor bulk import).
2. The browser parses each PDF with `pdfjs-dist`, extracts text per page,
   and runs a set of regex-based heuristics to pull out four fields per
   work order: **WO Number, WO Value, Date, Ministry/Division**.
3. If a field can't be found by regex, the browser calls a backend
   endpoint that asks Google's Gemini API to extract it from the raw page
   text (optional — the app works without this).
4. Extracted rows are shown in an editable verification table with
   computed columns (date-cutoff check, ministry/refinery check, R1/R2/R3
   eligibility rule, completion certificate, recommendation).
5. Rows are saved to a PostgreSQL table via the Express API (with a
   localStorage fallback if the API is unreachable).
6. The table can be exported to a `.xlsx` file matching the same column
   layout.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | lucide-react |
| PDF parsing | `pdfjs-dist` (runs fully in-browser, no server upload) |
| Excel export | `xlsx` (SheetJS) |
| Backend | Node.js + Express |
| Database | PostgreSQL (via `pg`) |
| AI fallback (optional) | Google Gemini API (`gemini-2.0-flash`), called from the backend only |
| Auth | Client-side only — `localStorage`, no real session/security (see Analysis) |

There is **no Python, no Docker, no OCR engine, no local LLM/VLM, and no
vector database** in this codebase, despite what earlier README drafts
claimed.

---

## 3. Design Philosophy

- **Single-file dashboard.** All extraction logic, table UI, editing, and
  export logic live in one component, `src/components/Dashboard.jsx`. This
  is an intentional choice (not an oversight) to keep the entire
  extraction pipeline visible and easy to reason about in one place,
  rather than spread across many small hooks/files.
- **Client-side first, server as a thin persistence layer.** PDFs never
  leave the browser except as raw extracted *text* sent to the optional
  AI-fallback endpoint. The Express backend does not parse PDFs; it only
  stores/reads/updates rows in Postgres.
- **Regex/heuristics first, AI as a fallback, not the primary engine.**
  The extraction pipeline tries several tiers of pattern matching
  (exact label match → contextual window scan → AI fallback) before
  giving up and marking a field "Not Found". This keeps the tool usable
  and free to run with zero API cost in the common case.
- **Config-driven verification rules.** All thresholds, valid-ministry
  lists, date cutoffs, currency formatting, and page-classification
  signal lists live in `src/config/config.js`, so business rules can be
  tuned without touching component code.
- **Graceful degradation.** If the Postgres API is unreachable, the app
  falls back to `localStorage` so the user doesn't lose in-progress work.

---

## 4. Architecture

```
┌─────────────────────────────┐        ┌───────────────────────────┐
│         Browser (React)      │        │        Backend (Node)      │
│                              │        │                            │
│  Login.jsx  (local-only auth)│        │  Express API (server.js)   │
│  Navbar.jsx                  │        │    GET    /api/bids        │
│  Dashboard.jsx                │        │    POST   /api/bids/bulk   │
│   ├─ pdfjs-dist: text extract │──JSON─▶│    PUT    /api/bids/:id    │
│   ├─ regex field extraction   │        │    DELETE /api/bids/:id    │
│   ├─ optional AI fallback ────┼──text─▶│    DELETE /api/bids        │
│   │   call (per page)         │        │    POST /api/extract-fallback
│   ├─ verification rules       │        │      (calls Gemini API)   │
│   │   (config.js)             │        │                            │
│   ├─ editable results table   │        │  db.js → PostgreSQL pool  │
│   └─ XLSX export (client-side)│        │                            │
└─────────────────────────────┘        └──────────────┬─────────────┘
                                                        ▼
                                                 PostgreSQL
                                            (extracted_bids table)
```

### Extraction pipeline (per uploaded PDF)

1. **Read file** → `pdfjs-dist` loads the PDF and extracts raw text per
   page (`page.getTextContent()`), joined into one string per page.
2. **Document-type branch:**
   - If the combined text looks like an IOCL/Haldia-style Work Order
     (`"INDIAN OIL"`, `"Haldia Refinery"`, or `"Work Order"` without
     `"GEMC"`), a dedicated single-record extraction path runs.
   - Otherwise, a generic **multi-contract scanner** walks page-by-page:
     any page matching a "new contract" signal (`Contract No`, `GEMC`,
     `Work Order No`, `PO No`, etc.) starts a new record; subsequent
     pages fill in whatever fields are still `"Not Found"` on the current
     record.
3. **Per-field regex tiers** (WO Number, WO Value, Date, Ministry each
   have their own ordered list of patterns, from strict/labelled matches
   down to a "search near a known anchor phrase" fallback).
4. **AI fallback**: if WO Number or WO Value is still missing after the
   regex tiers, the page text is sent to `POST /api/extract-fallback`,
   which prompts Gemini to return the four fields as JSON. Only fields
   still missing are filled in from the AI response.
5. **Formatting & de-duplication**: values are passed through Indian
   currency/date formatters, then records are de-duplicated by
   `(WO Number, page index)`, keeping whichever duplicate has the most
   non-"Not Found" fields populated.
6. **Persistence**: extracted records are buffered and flushed to
   Postgres in chunks of up to 100 rows (`POST /api/bids/bulk`), with a
   `localStorage` mirror kept in sync.

### Verification rules (all in `src/config/config.js`)

- **Date cutoff check** — "Yes" if the extracted date parses successfully
  and falls on/after `DATE_VERIFICATION_CUTOFF`.
- **Ministry/refinery check** — exact match against `VALID_MINISTRIES`,
  then substring/keyword match against `VALID_MINISTRY_KEYWORDS`.
- **R1/R2/R3 rule check** — per vendor (grouped by folder name at bulk
  import time), counts how many of that vendor's WO Values exceed each of
  three thresholds; a vendor passes if it meets any one rule's
  `(threshold, min-count)` pair.

---

## 5. Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx    # Everything: upload, extraction, table, export
│   │   ├── Login.jsx        # Local-storage-backed login/register form
│   │   └── Navbar.jsx       # Top bar (user name, role badge, logout)
│   ├── config/
│   │   └── config.js        # All business-rule thresholds & lists
│   ├── App.jsx               # Top-level auth state + routing between Login/Dashboard
│   ├── main.jsx
│   └── index.css
├── backend/
│   ├── server.js             # Express API (CRUD + Gemini fallback proxy)
│   ├── db.js                  # pg Pool, reads DB_* from backend/.env
│   └── package.json
├── database/
│   └── schema.sql             # extracted_bids table DDL
├── vite.config.js
└── package.json
```

---

## 6. Running the Project

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL running locally (or reachable) — optional; the app works in
  a degraded, localStorage-only mode without it
- A Gemini API key — optional; only needed for the AI-fallback extraction
  path

### 6.1 Database setup (optional but recommended)

```bash
psql -U postgres -f database/schema.sql
```

This creates `gem_portal_db` and the `extracted_bids` table.

### 6.2 Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=gem_portal_db
DB_PASSWORD=your_password
DB_PORT=5432

# Optional — enables the AI extraction fallback endpoint
GEMINI_API_KEY=your_gemini_api_key
```

```bash
npm start
```

The API listens on `http://localhost:5000` by default (`PORT` env var to
override — **note:** the frontend does not currently read this from
config; see Analysis §2).

### 6.3 Frontend

```bash
npm install
npm run dev
```

Vite will print a local dev URL (typically `http://localhost:5173`).
Open it, log in (see §6.4), and upload PDFs.

To build for production:

```bash
npm run build
npm run preview   # serve the built dist/ locally
```

### 6.4 Logging In

There is no real backend authentication. On first load:

- **Admin:** username `admin`, password `admin123` (hardcoded).
- **Any other user:** click "Need an account? Register Here" — credentials
  are stored in the browser's `localStorage` under `portal_users`, in
  plain text.

This is a UI gate only, not a security boundary — see Analysis §1.

---

## 7. Analysis & Caveats

This section is an honest technical assessment, not a feature list.

1. **Authentication is not real security.** `Login.jsx`/`App.jsx` store
   usernames and passwords in plaintext in browser `localStorage`, and
   the admin password (`admin123`) is hardcoded in client-side source
   that ships to every browser. Anyone with dev tools access can read
   credentials or simply skip login by manipulating component state. This
   is fine for an internal single-user tool or a demo, but it must not be
   treated as access control for sensitive procurement data.

2. **Hardcoded backend URLs, no environment config.** The frontend calls
   `http://localhost:5000/...` directly in two places in `Dashboard.jsx`
   (`API_BASE_URL` and the AI-fallback fetch). There's no `.env`/Vite env
   variable for this, so a production deployment (frontend and backend on
   different hosts) requires editing and rebuilding the frontend rather
   than changing configuration.

3. **`config.js`'s "Smart Page Router" is defined but not wired in.**
   `PAGE_FILTER_CONTRACT_SIGNALS` and `PAGE_FILTER_BOILERPLATE_SIGNALS`
   are exported from `config.js` and imported into `Dashboard.jsx`, and
   the config file's comments describe a page-classification step that
   skips boilerplate/legal pages before extraction — but no code in
   `Dashboard.jsx` actually calls a `classifyPage`-style function or
   filters pages using these lists before the extraction loop runs. Right
   now every page is fed into the extraction loop regardless of these
   signal lists. Either this is intentional in-progress work, or it's
   dead config — worth clarifying, since the previous project memory
   describes this as an implemented feature.

4. **No `normalizeDoubledText` handling in this codebase.** Bilingual
   PDF character-doubling normalization (mentioned in earlier project
   notes) isn't present in `Dashboard.jsx` here. If this repository is
   meant to be the same project as that earlier work, that logic appears
   to be missing from this copy/branch.

5. **Regex extraction is inherently fragile.** The WO Value/date/ministry
   extraction relies on layered regex heuristics tuned to specific label
   phrasings seen in sample PDFs. Any GeM/PSU template variation not
   covered by the existing patterns silently falls through to "Not
   Found" (or the optional AI fallback, if configured). There's no
   automated test suite validating extraction accuracy against a corpus
   of sample PDFs.

6. **AI fallback cost/availability is a single point of failure per
   page.** Every page where WO Number or WO Value isn't found triggers a
   separate Gemini API call from the backend. For large multi-page PDFs
   with many unmatched pages, this can mean many sequential API calls per
   document, with no caching, batching, or rate-limit handling.

7. **Previous README described a different system entirely.** The
   original `README.md`/`README_NEW.md` in this repo describe a Python/
   Docling/Ollama/Qwen2.5-VL/FastAPI/Docker Compose/pgvector pipeline.
   None of that exists anywhere in this repository — there's no Python
   code, no Docker files, no Ollama/Qwen references, and no vector
   database. That README appears to describe an aspirational or different
   version of this project rather than the code that's actually here. I
   verified this by grepping the codebase and confirming `npm install`
   and `npm run build` succeed against the *actual* stack (Vite/React/
   pdfjs-dist/Tailwind), which has nothing to do with that description.
   Worth flagging to whoever maintains this repo so the docs and code
   don't drift further apart.

8. **Package versions were validated.** I ran `npm install` and
   `npm run build` in a clean environment against this `package.json` —
   both succeeded (React 19.2.x, Vite 8.x, Tailwind 4.x, etc. all
   resolved and built cleanly), so the dependency versions listed are
   real and installable, not placeholders.
