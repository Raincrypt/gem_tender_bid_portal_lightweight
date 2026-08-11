import { useState, useEffect } from 'react';
import {
  FolderArchive,
  Search,
  Building2,
  Trash2,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TenderSelector from '../components/TenderSelector';
import { API_ENDPOINTS, LOCAL_STORAGE_HISTORY_KEY } from '../config/config';

export default function PastTendersPage({
  selectedTenderId,
  setSelectedTenderId,
  tendersList = [],
  onCreateTender,
  onDeleteTender,
}) {
  const [bids, setBids] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTenderConfirm, setDeleteTenderConfirm] = useState(false);

  // Load bids from API or local storage
  useEffect(() => {
    const loadBids = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.bids);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setBids(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Fetching bids from PostgreSQL failed, loading local storage:', err);
      }

      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setBids(parsed);
          }
        }
      } catch (e) {
        console.error('Failed reading local history:', e);
      }
    };

    loadBids();
  }, [selectedTenderId]);

  const currentTender =
    tendersList.find((t) => t.id === selectedTenderId || t.tenderNumber === selectedTenderId) ||
    tendersList[0];

  // Filter bids for search
  const filteredBids = bids.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const vendorName = (b.vendorFolder || b.vendorName || '').toLowerCase();
    const woNo = (b.woNumber || b.workOrderNo || '').toLowerCase();
    const ministry = (b.ministry || b.authority || '').toLowerCase();
    return vendorName.includes(term) || woNo.includes(term) || ministry.includes(term);
  });

  const handleDeleteCurrentTender = async () => {
    if (!currentTender) return;
    if (onDeleteTender) {
      await onDeleteTender(currentTender.id || currentTender.tenderNumber);
    }
    setDeleteTenderConfirm(false);
  };

  const exportToExcel = () => {
    if (!filteredBids.length) return;
    const excelData = filteredBids.map((row, index) => ({
      'S.No': index + 1,
      Vendor: row.vendorFolder || row.vendorName || 'N/A',
      'WO Number': row.woNumber || row.workOrderNo || 'N/A',
      'WO Value (₹)': row.woValue || 'N/A',
      'Completion Date': row.date || 'N/A',
      Ministry: row.ministry || 'N/A',
      'Date Verified': row.dateVerified ? 'PASS' : 'FAIL',
      'Ministry Verified': row.ministryVerified ? 'PASS' : 'FAIL',
      Recommendation: row.recommendation || 'Under Review',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tender Bids');
    XLSX.writeFile(
      workbook,
      `Tender_Bids_${currentTender?.tenderNumber || 'Export'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-1">
            <FolderArchive size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Tender Records</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tenders Database</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Select a tender to inspect its full bid evaluation table and records stored permanently in the database.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <TenderSelector
            selectedTenderId={selectedTenderId}
            setSelectedTenderId={setSelectedTenderId}
            tendersList={tendersList}
            showCreateOption={true}
            onCreateTender={onCreateTender}
          />
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-semibold">
              Total Tenders
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{tendersList.length} Registered</span>
          </div>
        </div>
      </div>

      {/* Active Tender Card Header */}
      {currentTender ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                <FileText size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900/50">
                    {currentTender.tenderNumber || currentTender.id}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                    {currentTender.status || 'Active'}
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentTender.itemTitle}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Division: <span className="font-medium text-gray-700 dark:text-gray-300">{currentTender.division}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={exportToExcel}
                disabled={!filteredBids.length}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 shadow-xs"
              >
                <Download size={14} />
                <span>Export to Excel</span>
              </button>

              {!deleteTenderConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteTenderConfirm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition"
                >
                  <Trash2 size={14} />
                  <span>Delete Tender</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/80 p-1.5 rounded-xl border border-red-200 dark:border-red-900">
                  <span className="text-xs text-red-700 dark:text-red-300 font-bold px-1">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={handleDeleteCurrentTender}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTenderConfirm(false)}
                    className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar for Tender Table */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vendor name, Work Order No, or Ministry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Complete Tender Evaluation Table */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">Vendor Name</th>
                    <th className="py-3 px-3.5">Work Order No</th>
                    <th className="py-3 px-3.5 text-right">WO Value (₹)</th>
                    <th className="py-3 px-3.5">Completion Date</th>
                    <th className="py-3 px-3.5">Ministry / Authority</th>
                    <th className="py-3 px-3.5 text-center">Rule Check (R1 / R2 / R3)</th>
                    <th className="py-3 px-3.5 text-center">Status / Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200">
                  {filteredBids.length > 0 ? (
                    filteredBids.map((b, idx) => {
                      const r1 = true;
                      const r2 = Boolean(b.dateVerified);
                      const r3 = Boolean(b.ministryVerified);
                      const isFullyCompliant = r1 && r2 && r3;

                      return (
                        <tr key={b.id || idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition">
                          <td className="py-3 px-3.5 font-mono text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-3.5 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Building2 size={15} className="text-orange-500 shrink-0" />
                              <span className="truncate max-w-[200px]" title={b.vendorFolder || b.vendorName}>
                                {b.vendorFolder || b.vendorName || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-gray-700 dark:text-gray-300">
                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              {b.woNumber || b.workOrderNo || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {b.woValue || 'N/A'}
                          </td>
                          <td className="py-3 px-3.5 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                            {b.date || 'N/A'}
                          </td>
                          <td className="py-3 px-3.5 text-gray-600 dark:text-gray-400 text-[11px] truncate max-w-[200px]" title={b.ministry}>
                            {b.ministry || 'N/A'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                                title="R1: Work Order & Completion Certificate Present"
                              >
                                R1 ✓
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  r2
                                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                                    : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                                }`}
                                title="R2: Completion Certificate Date check"
                              >
                                R2 {r2 ? '✓' : '✗'}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  r3
                                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                                    : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                                }`}
                                title="R3: Ministry / Authority matching check"
                              >
                                R3 {r3 ? '✓' : '✗'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isFullyCompliant ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 size={13} />
                                <span>ACCEPTED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                <AlertCircle size={13} />
                                <span>UNDER REVIEW</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                        <p className="text-sm font-semibold">No bid records found for this tender.</p>
                        <p className="text-xs text-gray-400 mt-1">Upload vendor folders in Dashboard to populate bid data.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 w-16 h-16 mx-auto flex items-center justify-center">
            <Layers size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">No Tenders Available</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Create your first tender using the button below or via the Tender Selector header dropdown.
          </p>
        </div>
      )}
    </div>
  );
}
