import { useRef, useEffect } from 'react';
import { Sun, Moon, Clock, Cpu, X } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  themeMode,
  setThemeMode,
  effectiveTheme,
  aiModel,
  setAiModel,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const aiModels = [
    { id: 'none', name: 'No Model (Fallback Disabled - Default)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Placeholder)' },
  ];

  return (
    <div
      ref={modalRef}
      className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 z-50 text-gray-900 dark:text-gray-100 transition-all transform animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-lg">
            <Cpu size={18} />
          </div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">Portal Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close Settings"
        >
          <X size={18} />
        </button>
      </div>

      <div className="py-4 space-y-5">
        {/* AI Model Fallback Setting */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            AI Fallback Model
          </label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            {aiModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-normal">
            Select an AI model to use as a fallback during context parsing, or select 'No Model' to disable fallback.
          </p>
        </div>

        {/* Theme Settings */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Theme Options
          </label>
          <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Light Option */}
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                themeMode === 'light'
                  ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm border border-gray-200/80 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sun size={15} />
              <span>Light</span>
            </button>

            {/* Dark Option */}
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                themeMode === 'dark'
                  ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm border border-gray-200/80 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Moon size={15} />
              <span>Dark</span>
            </button>

            {/* Clock Option */}
            <button
              type="button"
              onClick={() => setThemeMode('clock')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                themeMode === 'clock'
                  ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm border border-gray-200/80 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Clock size={15} />
              <span>Clock</span>
            </button>
          </div>

          {/* Clock Mode Info Badge */}
          {themeMode === 'clock' && (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-xs text-orange-800 dark:text-orange-300 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Clock size={13} className="text-orange-500 animate-pulse" />
                  <span>Clock Mode (6 AM–5 PM Day):</span>
                </span>
                <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/80 text-orange-900 dark:text-orange-200 text-[10px]">
                  {effectiveTheme === 'dark' ? '🌙 Dark (Night)' : '☀️ Light (Day)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
