import {
  BookOpen,
  FileSearch,
  UploadCloud,
  Save,
  CheckCircle2,
  FolderArchive,
  ShieldCheck,
  AlertCircle,
  Database,
} from 'lucide-react';

export default function UserGuidePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Guide &amp; Operational Instructions</h1>
            <p className="text-orange-100 text-xs mt-0.5">
              IOCL GeM Portal • Work Order &amp; Bid Qualification Verification Suite
            </p>
          </div>
        </div>
      </div>

      {/* Main Instruction Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Tender Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <FolderArchive size={18} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">1. Select or Create Active Tender</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Every vendor bid evaluation must be associated with an active Tender. Select the tender from the dropdown menu at the top of the Dashboard. If the tender is not listed, click <strong>"Create New Tender"</strong> to add a GEM tender number, item description, and division.
          </p>
          <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-100 dark:border-orange-900/40 text-[11px] text-orange-800 dark:text-orange-300 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-orange-600" />
            <span>Files cannot be saved or processed without selecting an active Tender.</span>
          </div>
        </div>

        {/* Step 2: Vendor Folder Bulk Upload */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-7 h-7 rounded-lg bg-[#003874]/10 dark:bg-indigo-950 text-[#003874] dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <UploadCloud size={18} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">2. Import Vendor PDF Folders</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Use the <strong>"Vendor Folder Bulk Import"</strong> section on the Dashboard. Select a root directory containing vendor folders (e.g. Folder 1, Folder 2...). Folders are automatically sorted sequentially, and contained PDF documents are scanned for Work Order details.
          </p>
          <div className="p-2.5 bg-[#003874]/5 dark:bg-indigo-950/40 rounded-xl border border-[#003874]/20 dark:border-indigo-900/40 text-[11px] text-[#003874] dark:text-indigo-300 flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-[#003874] dark:text-indigo-400" />
            <span>Natural sorting preserves folder ordering (Vendor 1, Vendor 2, Vendor 3...).</span>
          </div>
        </div>

        {/* Step 3: Review & Rule Checks */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <ShieldCheck size={18} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">3. Verify Automated Rule Checks</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Extracted records are subjected to three automated compliance rules:
          </p>
          <ul className="text-[11px] space-y-1 text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li><strong>Rule 1 (Date):</strong> Issue date must be after 01-Jan-2019 cutoff.</li>
            <li><strong>Rule 2 (Ministry):</strong> Buyer must match valid Ministries/CPSEs.</li>
            <li><strong>Rule 3 (Cert):</strong> Work completion certificate must be present.</li>
          </ul>
        </div>

        {/* Step 4: Save to Database */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
              4
            </span>
            <Database size={18} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">4. Save Records to Database</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Click <strong>"Save to Database"</strong> in the Dashboard or Manual Review tab to save all verified bid records to PostgreSQL. Saved records will persist across browser sessions and appear in tender history.
          </p>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Save size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <span>Chunked API uploads ensure high performance even with large bid batches.</span>
          </div>
        </div>
      </div>

      {/* Manual Review Deep Dive */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
          <FileSearch size={20} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Manual Review &amp; Side-by-Side PDF Audit</h2>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          The <strong>Manual Review</strong> tab allows comprehensive document verification with side-by-side PDF preview:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Red Indicator</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              PDF file has not been opened or reviewed yet (0 pages viewed).
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Yellow Indicator</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              PDF file is partially read (some pages viewed, but not all pages).
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Green Indicator</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              PDF file has been completely reviewed across all pages.
            </p>
          </div>
        </div>

        <div className="pt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
          <p>
            • <strong>Page-Sync Tracking:</strong> As you scroll through PDF pages, the active extracted row matching that page range is automatically highlighted.
          </p>
          <p>
            • <strong>Manual Row Addition:</strong> Click <strong>"Add Row"</strong> to insert a new extracted record for a specific PDF. It automatically retains the exact data schema and reflects in the Dashboard.
          </p>
        </div>
      </div>

      {/* Footer Support Note */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/60 text-center text-xs text-gray-500 dark:text-gray-400">
        Indian Oil Corporation Limited • GeM Bid Evaluation &amp; Verification Suite
      </div>
    </div>
  );
}
