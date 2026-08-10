import { X, Save } from 'lucide-react';

export default function PdfModal({
  isOpen,
  modalRow,
  modalEditData,
  modalPdfUrl,
  handleModalFieldChange,
  saveModalChanges,
  closePdfModal,
  verifyDateAfterCutoff,
  verifyMinistryDepartment,
}) {
  if (!isOpen || !modalRow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-gray-900/70 dark:bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">PDF Viewer &amp; Record Editor</h3>
          <button
            onClick={closePdfModal}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/3 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/60">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4">Record Details</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">WO Number</label>
                <input
                  type="text"
                  value={modalEditData.woNumber || ''}
                  onChange={(e) => handleModalFieldChange('woNumber', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">WO Value</label>
                <input
                  type="text"
                  value={modalEditData.woValue || ''}
                  onChange={(e) => handleModalFieldChange('woValue', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input
                  type="text"
                  value={modalEditData.date || ''}
                  onChange={(e) => handleModalFieldChange('date', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ministry / Division</label>
                <input
                  type="text"
                  value={modalEditData.ministry || ''}
                  onChange={(e) => handleModalFieldChange('ministry', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date Verified (Yes/No)</label>
                <select
                  value={
                    modalEditData.dateVerified ||
                    (verifyDateAfterCutoff ? verifyDateAfterCutoff(modalEditData.date) : 'No')
                  }
                  onChange={(e) => handleModalFieldChange('dateVerified', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ministry Verified (Yes/No)</label>
                <select
                  value={
                    modalEditData.ministryVerified ||
                    (verifyMinistryDepartment ? verifyMinistryDepartment(modalEditData.ministry) : 'No')
                  }
                  onChange={(e) => handleModalFieldChange('ministryVerified', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Completion Certificate</label>
                <select
                  value={modalEditData.completionCertificate || 'No'}
                  onChange={(e) => handleModalFieldChange('completionCertificate', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recommendation</label>
                <select
                  value={modalEditData.recommendation || 'No'}
                  onChange={(e) => handleModalFieldChange('recommendation', e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center space-x-3">
              <button
                onClick={saveModalChanges}
                className="flex items-center space-x-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg transition"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
              <button
                onClick={closePdfModal}
                className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-5 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="w-full md:w-2/3 h-96 md:h-auto bg-gray-100 dark:bg-gray-950">
            {modalPdfUrl ? (
              <embed
                src={modalPdfUrl}
                type="application/pdf"
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 text-sm">
                No PDF available for this record.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
