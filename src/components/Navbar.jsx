import { useState } from 'react';
import { ShieldAlert, UserCheck, LogOut, User, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Navbar({
  isAdmin,
  username,
  onLogout,
  themeMode,
  setThemeMode,
  effectiveTheme,
  aiModel,
  setAiModel,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 px-6 py-4 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Portal Logo Group */}
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-black tracking-wider select-none">GeM</div>
          <span className="text-lg font-bold text-gray-900 dark:text-white border-l pl-3 border-gray-300 dark:border-gray-700">Bid Intelligent Extraction</span>
        </div>
        
        {/* Dynamic Context Parameters & Controls */}
        <div className="flex items-center space-x-4">
          
          {/* Active Persona Identification Label */}
          <div className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <User size={15} className="text-gray-400 dark:text-gray-500" />
            <span>Hello, <strong className="text-gray-900 dark:text-white">{username || 'User'}</strong></span>
          </div>

          {/* Role Status Tag */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border ${
            isAdmin
              ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
              : 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'
          }`}>
            {isAdmin ? <ShieldAlert size={15} /> : <UserCheck size={15} />}
            <span>{isAdmin ? 'ADMIN ACCESS' : 'STANDARD WORKER'}</span>
          </div>

          {/* Divider Line */}
          <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Settings Trigger & Dropdown Modal Container */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1.5 px-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Portal Settings"
              aria-label="Settings"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              effectiveTheme={effectiveTheme}
              aiModel={aiModel}
              setAiModel={setAiModel}
            />
          </div>

          {/* Action trigger button */}
          <button 
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}