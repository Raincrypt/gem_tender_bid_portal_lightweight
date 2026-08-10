import { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ManualReview from './components/ManualReview';
import Sidebar from './components/Sidebar';
import TendersPlaceholder from './components/TendersPlaceholder';
import CurrentTendersPlaceholder from './components/CurrentTendersPlaceholder';
import UserGuide from './components/UserGuide';
import AdvancedTesting from './components/AdvancedTesting';
import { API_ENDPOINTS, LOCAL_STORAGE_HISTORY_KEY, LOCAL_STORAGE_TENDERS_KEY } from './config/config';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  // Sidebar navigation state: 'dashboard' | 'manual-review' | 'tenders' | 'current-tenders'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Uploads check state
  const [hasUploads, setHasUploads] = useState(false);

  // Active Tender & Tenders list state
  const [tendersList, setTendersList] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TENDERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed parsing local tenders:', e);
    }
    return [];
  });

  const [selectedTenderId, setSelectedTenderId] = useState('');

  // Settings State: themeMode ('light' | 'dark' | 'clock') & aiModel fallback
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('portal_theme') || 'light';
  });
  const [aiModel, setAiModel] = useState(() => {
    return localStorage.getItem('portal_ai_model') || 'none';
  });
  const [clockEffectiveTheme, setClockEffectiveTheme] = useState('light');

  // Calculate clock theme (6:00 to 17:00 (5 PM) is light, 17:00 to 6:00 is dark)
  const getClockTheme = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 17 ? 'light' : 'dark';
  };

  const effectiveTheme = themeMode === 'clock' ? clockEffectiveTheme : themeMode;

  // Check upload status across storage and backend
  const checkUploadsStatus = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.bids);
      if (res.ok) {
        const bids = await res.json();
        if (Array.isArray(bids) && bids.length > 0) {
          setHasUploads(true);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend fetch failed, checking local storage for uploads:', err);
    }

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasUploads(true);
          return;
        }
      }
    } catch (e) {
      console.error('Error parsing local history:', e);
    }

    setHasUploads(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) checkUploadsStatus();
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [checkUploadsStatus, activeTab]);

  // Load tenders from PostgreSQL or fallback to local
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.tenders);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTendersList(data);
            localStorage.setItem(LOCAL_STORAGE_TENDERS_KEY, JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn('PostgreSQL fetch tenders failed, using current tenders state:', err);
      }
    };
    fetchTenders();
  }, []);

  // Create new tender handler
  const handleCreateTender = async ({ tenderNumber, itemTitle, division }) => {
    const newTenderObj = {
      id: `TND-${Date.now()}`,
      tenderNumber,
      itemTitle,
      division: division || 'Haldia Refinery Division',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    // Update state & local storage immediately
    const updatedList = [newTenderObj, ...tendersList];
    setTendersList(updatedList);
    setSelectedTenderId(newTenderObj.id);
    localStorage.setItem(LOCAL_STORAGE_TENDERS_KEY, JSON.stringify(updatedList));

    // Post to backend database
    try {
      await fetch(API_ENDPOINTS.tenders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenderObj),
      });
    } catch (err) {
      console.warn('Save tender to PostgreSQL backend offline:', err);
    }
  };

  // Delete tender handler
  const handleDeleteTender = async (tenderIdToDelete) => {
    const updatedList = tendersList.filter(
      (t) => t.id !== tenderIdToDelete && t.tenderNumber !== tenderIdToDelete
    );
    setTendersList(updatedList);
    if (selectedTenderId === tenderIdToDelete) {
      setSelectedTenderId(updatedList[0]?.id || '');
    }
    localStorage.setItem(LOCAL_STORAGE_TENDERS_KEY, JSON.stringify(updatedList));

    try {
      await fetch(`${API_ENDPOINTS.tenders}/${tenderIdToDelete}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Delete tender from PostgreSQL backend failed:', err);
    }
  };

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('portal_theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('portal_ai_model', aiModel);
  }, [aiModel]);

  // Periodically check clock theme if mode is 'clock'
  useEffect(() => {
    const updateClockTheme = () => {
      setClockEffectiveTheme(getClockTheme());
    };
    updateClockTheme();
    const interval = setInterval(updateClockTheme, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply dark class to document element for Tailwind dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effectiveTheme]);

  const handleLogin = (username, password) => {
    const users = JSON.parse(localStorage.getItem('portal_users')) || {};

    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      setIsLoggedIn(true);
      setIsAdmin(true);
      setCurrentUser('Admin');
      return { success: true };
    }

    if (users[username]) {
      if (users[username] === password) {
        setIsLoggedIn(true);
        setIsAdmin(username.toLowerCase() === 'admin');
        setCurrentUser(username);
        return { success: true };
      } else {
        return { success: false, message: 'Incorrect password. Access Denied.' };
      }
    } else {
      return { success: false, message: 'Username not found. Please register first.' };
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser('');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 m-0 p-0 transition-colors duration-200 flex flex-col">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Navbar
            isAdmin={isAdmin}
            username={currentUser}
            onLogout={handleLogout}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            effectiveTheme={effectiveTheme}
            aiModel={aiModel}
            setAiModel={setAiModel}
          />
          <div className="flex flex-1 overflow-hidden min-h-0">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              hasUploads={hasUploads}
            />
            <main className="flex-1 overflow-y-auto h-full">
              <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
                <Dashboard
                  selectedTenderId={selectedTenderId}
                  setSelectedTenderId={setSelectedTenderId}
                  tendersList={tendersList}
                  onCreateTender={handleCreateTender}
                  onRecordsChange={checkUploadsStatus}
                />
              </div>
              <div className={activeTab === 'manual-review' ? 'block' : 'hidden'}>
                <ManualReview selectedTenderId={selectedTenderId} />
              </div>
              <div className={activeTab === 'tenders' ? 'block' : 'hidden'}>
                <TendersPlaceholder
                  selectedTenderId={selectedTenderId}
                  setSelectedTenderId={setSelectedTenderId}
                  tendersList={tendersList}
                  onCreateTender={handleCreateTender}
                  onDeleteTender={handleDeleteTender}
                />
              </div>
              <div className={activeTab === 'current-tenders' ? 'block' : 'hidden'}>
                <CurrentTendersPlaceholder
                  selectedTenderId={selectedTenderId}
                  setSelectedTenderId={setSelectedTenderId}
                  tendersList={tendersList}
                  onCreateTender={handleCreateTender}
                  onDeleteTender={handleDeleteTender}
                />
              </div>
              <div className={activeTab === 'user-guide' ? 'block' : 'hidden'}>
                <UserGuide />
              </div>
              <div className={activeTab === 'advanced-testing' ? 'block' : 'hidden'}>
                <AdvancedTesting selectedTenderId={selectedTenderId} aiModel={aiModel} />
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default App;