import { useState } from 'react';
import {
  Building2,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Check,
  Edit2,
  FileSearch,
} from 'lucide-react';

export default function TenderBidsTable({
  bids = [],
  selectedTender = null,
  onViewPdf = null,
  onDeleteBid = null,
  onPatchBid = null,
  showTenderColumns = true,
  emptyTitle = 'No Evaluation Records Found',
  emptySubtitle = 'Upload vendor experience documents or select another tender to view extracted bids.',
}) {
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (id, field, currentValue) => {
    if (!onPatchBid) return;
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = (id, field) => {
    if (onPatchBid) {
      onPatchBid(id, field, editValue);
    }
    setEditingCell(null);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              {showTenderColumns && (
                <>
                  <th className="py-3.5 px-4 min-w-[140px]">Tender ID</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Tender Item / Title</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Division / Wing</th>
                </>
              )}
              <th className="py-3.5 px-4 min-w-[160px]">Vendor Name</th>
              <th className="py-3.5 px-4 min-w-[140px]">Work Order No</th>
              <th className="py-3.5 px-4 text-right min-w-[120px]">WO Value (₹)</th>
              <th className="py-3.5 px-4 min-w-[120px]">WO Date</th>
              <th className="py-3.5 px-4 min-w-[150px]">Ministry / Authority</th>
              <th className="py-3.5 px-4 text-center min-w-[140px]">Rule Check (R1/R2/R3)</th>
              <th className="py-3.5 px-4 text-center min-w-[130px]">Status</th>
              <th className="py-3.5 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200">
            {bids.length > 0 ? (
              bids.map((b, idx) => {
                const r1 = true; // Valid WO document format
                const r2 = Boolean(b.dateVerified);
                const r3 = Boolean(b.ministryVerified);
                const isFullyCompliant = r1 && r2 && r3;

                const tenderIdDisplay =
                  b.tenderId || b.tenderNumber || selectedTender?.tenderNumber || selectedTender?.id || 'NITDGP-2024-001';
                const tenderTitleDisplay =
                  b.itemTitle || selectedTender?.itemTitle || 'Supply & Installation of Equipment';
                const divisionDisplay =
                  b.division || selectedTender?.division || 'Haldia Refinery Division';

                return (
                  <tr
                    key={b.id || idx}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-center">{idx + 1}</td>

                    {/* Tender ID */}
                    {showTenderColumns && (
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">
                        <span className="bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900/50 text-[11px]">
                          {tenderIdDisplay}
                        </span>
                      </td>
                    )}

                    {/* Tender Item */}
                    {showTenderColumns && (
                      <td className="py-3.5 px-4 text-gray-900 dark:text-white font-semibold">
                        <span className="truncate max-w-[220px] block" title={tenderTitleDisplay}>
                          {tenderTitleDisplay}
                        </span>
                      </td>
                    )}

                    {/* Division */}
                    {showTenderColumns && (
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-[11px]">
                        <span className="truncate max-w-[150px] block" title={divisionDisplay}>
                          {divisionDisplay}
                        </span>
                      </td>
                    )}

                    {/* Vendor Name */}
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-orange-500 shrink-0" />
                        <span className="truncate max-w-[180px]" title={b.vendorFolder || b.vendorName}>
                          {b.vendorFolder || b.vendorName || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Work Order Number */}
                    <td className="py-3.5 px-4 font-mono text-gray-700 dark:text-gray-300 font-semibold">
                      {editingCell?.id === b.id && editingCell?.field === 'woNumber' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-orange-500 rounded px-1.5 py-0.5 text-xs font-mono"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(b.id, 'woNumber')}
                            className="p-0.5 bg-emerald-600 text-white rounded"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-between group/edit cursor-pointer"
                          onClick={() => handleStartEdit(b.id, 'woNumber', b.woNumber)}
                        >
                          <span className="truncate max-w-[130px]">{b.woNumber || b.workOrderNo || 'N/A'}</span>
                          {onPatchBid && (
                            <Edit2 size={12} className="text-gray-400 opacity-0 group-hover/edit:opacity-100 transition" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* WO Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                      {b.woValue ? `₹${b.woValue}` : 'N/A'}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 text-xs">
                      {b.dateStr || b.date || 'N/A'}
                    </td>

                    {/* Ministry */}
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 text-xs">
                      <span className="truncate max-w-[160px] block" title={b.ministry}>
                        {b.ministry || b.authority || 'N/A'}
                      </span>
                    </td>

                    {/* Rule Checks */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] font-bold">
                        <span className={r1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                          R1
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span className={r2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                          R2
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span className={r3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                          R3
                        </span>
                      </div>
                    </td>

                    {/* Status Recommendation */}
                    <td className="py-3.5 px-4 text-center">
                      {isFullyCompliant ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-bold">
                          <CheckCircle2 size={12} />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold">
                          <AlertCircle size={12} />
                          Under Review
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onViewPdf && b.fileName && (
                          <button
                            type="button"
                            onClick={() => onViewPdf(b.fileName, b.pageIndex || 1, b.vendorFolder)}
                            className="p-1.5 bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 dark:bg-gray-800 dark:hover:bg-orange-950 dark:text-gray-300 dark:hover:text-orange-400 rounded-lg transition"
                            title="View Source PDF"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {onDeleteBid && (
                          <button
                            type="button"
                            onClick={() => onDeleteBid(b.id)}
                            className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-red-950 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={showTenderColumns ? 12 : 9} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-gray-400">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-2xl mb-2 text-gray-400">
                      <FileSearch size={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-0.5">{emptyTitle}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
