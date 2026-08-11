import { CheckCircle2 } from 'lucide-react';
import TenderSelector from '../components/TenderSelector';

export default function CurrentTendersPage({
  selectedTenderId,
  setSelectedTenderId,
  tendersList = [],
  onCreateTender,
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle2 size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Accepted Tenders</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Accepted Tenders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Overview of accepted tenders and approved vendor evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TenderSelector
            selectedTenderId={selectedTenderId}
            setSelectedTenderId={setSelectedTenderId}
            tendersList={tendersList}
            showCreateOption={false}
            onCreateTender={onCreateTender}
          />
        </div>
      </div>

      {/* Blank Page Area */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center min-h-[350px] flex flex-col items-center justify-center shadow-xs">
        <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          No Accepted Tenders Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Accepted tenders and approved vendor compliance reports will appear here once finalized from the evaluation dashboard.
        </p>
      </div>
    </div>
  );
}
