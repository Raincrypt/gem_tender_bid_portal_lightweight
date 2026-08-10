import { useState } from 'react';
import { ChevronDown, PlusCircle, Check, FileText, Layers, X, Save } from 'lucide-react';

export default function TenderSelector({
  selectedTenderId,
  setSelectedTenderId,
  tendersList = [],
  showCreateOption = true,
  onCreateTender,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenderNumber, setNewTenderNumber] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newDivision, setNewDivision] = useState('Haldia Refinery Division');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentTender = selectedTenderId
    ? tendersList.find((t) => t.id === selectedTenderId || t.tenderNumber === selectedTenderId)
    : null;

  const handleSelectTender = (tender) => {
    setSelectedTenderId(tender.id || tender.tenderNumber);
    setIsOpen(false);
  };

  const handleOpenModal = () => {
    setIsOpen(false);
    setErrorMsg('');
    setNewTenderNumber(`GEM/${new Date().getFullYear()}/B/${Math.floor(100000 + Math.random() * 900000)}`);
    setNewItemTitle('');
    setNewDivision('Haldia Refinery Division');
    setIsModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTenderNumber.trim() || !newItemTitle.trim()) {
      setErrorMsg('Both Tender ID and Tender Item are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (onCreateTender) {
        const created = await onCreateTender({
          tenderNumber: newTenderNumber.trim(),
          itemTitle: newItemTitle.trim(),
          division: newDivision.trim() || 'Haldia Refinery Division',
        });
        if (created?.id) {
          setSelectedTenderId(created.id);
        } else if (created?.tenderNumber) {
          setSelectedTenderId(created.tenderNumber);
        } else {
          setSelectedTenderId(newTenderNumber.trim());
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed creating tender:', err);
      setErrorMsg(err.message || 'Error saving tender to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Dropdown Trigger Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl shadow-sm text-left transition text-xs font-medium focus:outline-none min-w-[280px] max-w-[420px]"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${currentTender ? 'bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500">
                  Current Tender
                </span>
                {currentTender ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                    Select Tender
                  </span>
                )}
              </div>
              <p className={`font-mono font-bold truncate text-xs ${currentTender ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 font-normal italic'}`}>
                {currentTender ? (currentTender.tenderNumber || currentTender.id) : '-- Select Tender --'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-normal">
                {currentTender ? currentTender.itemTitle : 'Choose a tender from list to evaluate'}
              </p>
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 sm:left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 z-30 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                <Layers size={14} className="text-orange-500" />
                <span>Select Tender in Display</span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                {tendersList.length} Available
              </span>
            </div>

            {/* List of Tenders */}
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
              {tendersList.map((tender) => {
                const isSelected =
                  !!currentTender &&
                  (tender.id === currentTender.id || tender.tenderNumber === currentTender.tenderNumber);
                return (
                  <button
                    key={tender.id || tender.tenderNumber}
                    type="button"
                    onClick={() => handleSelectTender(tender)}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-950 dark:text-orange-100 border border-orange-200 dark:border-orange-900/50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <Check size={16} className="text-orange-600 dark:text-orange-400" />
                      ) : (
                        <FileText size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate">
                          {tender.tenderNumber || tender.id}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {tender.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate mt-0.5">
                        {tender.itemTitle}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {tender.division || 'Haldia Refinery Division'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Create Tender Button Option */}
            {showCreateOption && (
              <div className="p-2 bg-gray-50 dark:bg-gray-800/40">
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <PlusCircle size={15} />
                  <span>Create Tender</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Create Tender */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Create New Tender</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add a new GeM tender record to the database roster
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Field 1: Tender ID / Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Tender ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GEM/2026/B/884190"
                  value={newTenderNumber}
                  onChange={(e) => setNewTenderNumber(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Unique GeM Tender Reference ID or WO Contract Code</p>
              </div>

              {/* Field 2: Tender Item */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Tender Item / Title <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Supply and Installation of High-Pressure Refinery Valves"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Full description of work item or service scope</p>
              </div>

              {/* Field 3: Division */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Division / Wing
                </label>
                <input
                  type="text"
                  placeholder="e.g. Haldia Refinery Division"
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSubmitting ? 'Saving...' : 'Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
