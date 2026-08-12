# GeM Bid Portal — Contract Extraction & Verification Platform

A full-stack Web Application for automated extraction, verification, rule evaluation, and historical archiving of GeM (Government e-Marketplace) and PSU work-order contracts. The portal parses PDF documents in-browser, extracts critical contract metadata (Work Order Number, WO Value, Completion Date, Ministry/Department), evaluates vendor eligibility against configurable compliance rules (R1/R2/R3), and persists tender evaluation records to a dual-engine database backend (PostgreSQL / SQLite).

---

## 🛠️ 1. Tech Stack

### Frontend Architecture
- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool & Dev Server:** Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling & Design System:** Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`, `autoprefixer`, `postcss`)
- **UI Components & Icons:** Lucide React (`lucide-react`)
- **In-Browser PDF Engine:** `pdfjs-dist` (Page text parsing and canvas rendering) & `pdf-lib`
- **Data Export:** SheetJS (`xlsx`) for Excel report generation

### Backend Architecture
- **API Runtime:** Python 3 (Flask + Flask-CORS)
- **Database Drivers:** `psycopg2` (PostgreSQL) + Python `sqlite3` (built-in fallback)
- **Environment Management:** `python-dotenv`
- **Development Proxy:** Vite proxy server (`startBackendPlugin`) auto-spawns Python Flask on port 5000 and maps `/api/*` endpoints to port 3000.

### Database Layer
- **Primary Engine:** PostgreSQL
- **Fallback Engine:** Embedded SQLite (`backend/database.db`) with automatic table creation and column migration handling (`init_db()` in `backend/db.py`).

---

## 🏗️ 2. Application Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER (React 19 + Vite)                            │
│                                                                                  │
│  ┌──────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐ │
│  │   Dashboard Page     │  │   Past Tenders Page   │  │   Manual Review Page  │ │
│  └──────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘ │
│             │                          │                          │             │
│             └──────────────────────────┼──────────────────────────┘             │
│                                        ▼                                         │
│                      ┌────────────────────────────────────┐                      │
│                      │   TenderBidsTable (Unified UI)     │                      │
│                      └─────────────────┬──────────────────┘                      │
│                                        │                                         │
│  ┌─────────────────────────────────────┴──────────────────────────────────────┐ │
│  │              PDF Processing Service (src/services/pdfProcessor.js)       │ │
│  │  - pdfjs-dist text extraction per page                                    │ │
│  │  - Document Type Branching (IOCL / Haldia vs Generic Multi-Contract)      │ │
│  │  - Layered Regex Matchers (WO Number, WO Value, Date, Ministry)           │ │
│  │  - Currency & Date Normalizers (Indian Numbering System)                  │ │
│  └─────────────────────────────────────┬──────────────────────────────────────┘ │
└────────────────────────────────────────┼────────────────────────────────────────┘
                                         │ HTTP REST API (/api/*)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Python / Flask)                              │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                            REST API (backend/app.py)                       │  │
│  │  - /api/tenders     [GET, POST, DELETE] (Tender master records)           │  │
│  │  - /api/bids        [GET, POST, PATCH, DELETE] (Filtered bid extraction)  │  │
│  │  - /api/bids/bulk   [POST] (Chunked batch saving)                          │  │
│  │  - /api/log/*       [POST, DELETE] (Client/Server file logging)           │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
│                                        │                                         │
│  ┌─────────────────────────────────────┴──────────────────────────────────────┐  │
│  │                       Database Adapter (backend/db.py)                     │  │
│  │  - Automatic DB Type Detection (PostgreSQL if env set, else SQLite)        │  │
│  │  - Graceful Schema Migrations & Table Initialization                       │  │
│  └─────────────────────────────────────┬──────────────────────────────────────┘  │
└────────────────────────────────────────┼────────────────────────────────────────┘
                                         │
                                  ┌──────┴──────┐
                                  ▼             ▼
                            PostgreSQL      SQLite Fallback
                             (Remote)    (backend/database.db)
```

### Key Architectural Concepts

1. **Client-Side Heavy PDF Parsing**: Contract PDFs are parsed locally in the browser using `pdfjs-dist`. Raw binary files are never needlessly uploaded to a server for text extraction, minimizing latency and server memory overhead.
2. **Unified Data Schema**: Bids and Tenders share linked identifiers (`tender_id`, `item_title`, `division`, `status`) across both frontend state and backend storage.
3. **Dual Database Failover**: The application seamlessly connects to PostgreSQL if environment variables (`DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`) are present. If disconnected or unconfigured, it automatically falls back to an embedded SQLite database (`backend/database.db`).
4. **Unified Interactive Components**: The `TenderBidsTable` component renders evaluation records across pages with built-in inline editing, source PDF page modal triggers, compliance rule check badges (R1/R2/R3), and status tagging.

---

## 📂 3. Repository Directory Structure

```
.
├── backend/
│   ├── app.py              # Flask REST API endpoints & logging handlers
│   ├── db.py               # Dual-engine DB adapter (PostgreSQL + SQLite)
│   ├── database.db         # Embedded SQLite database (created automatically)
│   └── logs/               # Server, client, and extracted text audit logs
├── src/
│   ├── components/         # Reusable UI Components
│   │   ├── TenderBidsTable.jsx  # Unified interactive evaluation table
│   │   ├── TenderSelector.jsx   # Active tender selector & creation modal
│   │   ├── PdfModal.jsx         # In-app PDF viewer modal
│   │   ├── SettingsModal.jsx    # Config & preferences modal
│   │   ├── Sidebar.jsx          # Collapsible navigation drawer
│   │   ├── Navbar.jsx           # Application header bar
│   │   └── Login.jsx            # Authentication interface
│   ├── pages/              # Application Views
│   │   ├── DashboardPage.jsx      # Primary PDF extraction & evaluation workbench
│   │   ├── PastTendersPage.jsx    # Historical tender archive & reports
│   │   ├── CurrentTendersPage.jsx # Active tender management
│   │   ├── ManualReviewPage.jsx   # Flagged contract manual verification
│   │   ├── AdvancedTestingPage.jsx# Extraction algorithm test suite
│   │   └── UserGuidePage.jsx      # In-app documentation & user manual
│   ├── services/
│   │   └── pdfProcessor.js # Client-side PDF parsing & regex extraction pipeline
│   ├── config/
│   │   └── config.js       # Business rules, date cutoffs, & ministry keywords
│   ├── App.jsx             # Main routing & layout controller
│   ├── main.jsx            # React application entry point
│   └── index.css           # Tailwind CSS directives
├── package.json            # Node.js dependencies & scripts
├── vite.config.js          # Vite config with backend auto-spawn plugin
└── README.md               # Project documentation
```

---

## 🚀 4. How to Run the Application

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Python**: v3.9 or higher

---

### Method 1: Single-Command Development (Recommended)

The project includes an integrated Vite backend plugin (`startBackendPlugin`) that automatically launches the Python Flask server when you run the Vite dev server.

1. **Install Frontend & Root Dependencies:**
   ```bash
   npm install
   ```

2. **Install Python Backend Dependencies:**
   ```bash
   pip install flask flask-cors psycopg2-binary python-dotenv
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Access Application:**
   Open your browser and navigate to `http://localhost:3000` (or `http://localhost:5173`).

---

### Method 2: Manual Terminal Setup (Separate Processes)

If you prefer to run the Flask API and Vite dev server in separate terminal windows:

#### Terminal 1 — Python Flask Backend
```bash
# Navigate to backend directory or project root
python backend/app.py
```
*The Flask API will start listening on `http://127.0.0.1:5000`.*

#### Terminal 2 — React Frontend
```bash
npm install
npm run dev
```
*Vite will start on `http://localhost:3000` and proxy `/api/*` requests to port `5000`.*

---

### ⚙️ 5. Database Configuration (Optional PostgreSQL)

By default, the application runs out-of-the-box with **SQLite** (`backend/database.db`) requiring **zero configuration**.

To connect to a **PostgreSQL** instance, create a `.env` file in the root directory:

```env
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gem_portal_db
```

When these environment variables are detected, `backend/db.py` will connect to PostgreSQL and automatically initialize/migrate the required tables (`tenders` and `extracted_bids`).

---

## 📊 6. Workflow & Key Features

1. **Select / Create Tender**: Choose an active Tender ID (e.g., `NITDGP-2024-001`) or create a new tender from the top selection toolbar.
2. **Bulk Vendor Folder Import**: Drag and drop vendor experience folders containing contract PDFs into the upload area.
3. **Automated Extraction**: The browser engine extracts Work Order Numbers, Values (formatted to INR ₹), Dates, and Ministries using multi-tiered regex rules.
4. **Rule Evaluation (R1 / R2 / R3)**:
   - **R1**: Work Order Document & Completion Certificate validity check.
   - **R2**: Completion date verification against cutoff dates.
   - **R3**: Ministry / Department matching verification.
5. **Inline Editing & Inspection**: Click any field in the evaluation table to edit values directly, or click the view button to inspect the original PDF page in a side-by-side modal.
6. **Excel Report Export**: Click **Export Excel** to generate formatted `.xlsx` spreadsheets for official evaluation documentation.
