import { LayoutDashboard, FileSearch, FolderArchive, CheckCircle, BookOpen, FlaskConical, Menu } from 'lucide-react';
import SidebarArt from './SidebarArt';

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, hasUploads = false }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Vendor import & bid summary table',
      icon: LayoutDashboard,
    },
    {
      id: 'manual-review',
      label: 'Manual Review',
      description: hasUploads ? 'Full-page PDF & field audit inspector' : 'Upload PDFs to unlock page review',
      icon: FileSearch,
      badge: hasUploads ? 'Interactive' : 'No Uploads',
      isDisabled: !hasUploads,
    },
    {
      id: 'tenders',
      label: 'Tenders',
      description: 'All previous tender records',
      icon: FolderArchive,
    },
    {
      id: 'current-tenders',
      label: 'Current Tenders',
      description: 'Accepted vendors & active bids',
      icon: CheckCircle,
      },
    {
      id: 'user-guide',
      label: 'User Guide',
      description: 'Instructions to use application',
      icon: BookOpen,
    },
    {
      id: 'advanced-testing',
      label: 'Advanced Testing',
      description: 'Single PDF extraction test & diagnostic suite',
      icon: FlaskConical,
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col shrink-0 h-full overflow-y-auto ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Header Toggle */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center">
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-full h-[52px] text-left rounded-xl overflow-hidden hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <SidebarArt className="w-full h-full" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-full h-[52px] rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <Menu size={22} className="text-gray-700 dark:text-gray-200" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="p-2 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = item.isDisabled;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600'
                  : isActive
                  ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-semibold border border-orange-200 dark:border-orange-900/60 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 font-medium'
              }`}
              title={isDisabled ? 'Upload vendor PDFs to unlock Manual Review' : isCollapsed ? item.label : undefined}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Icon
                  size={20}
                  className={`shrink-0 ${
                    isDisabled
                      ? 'text-gray-300 dark:text-gray-700'
                      : isActive
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 shrink-0 ${
                          isDisabled
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            : 'bg-orange-100 dark:bg-orange-900/80 text-orange-800 dark:text-orange-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate font-normal">
                    {item.description}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer status hint */}
      {!isCollapsed && (
        <div className="p-3 m-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">IOCL GeM Portal</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">v2.4 • Verification Suite</p>
        </div>
      )}
    </aside>
  );
}
