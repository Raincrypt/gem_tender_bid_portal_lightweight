import { useState, useEffect } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  // Settings State: themeMode ('light' | 'dark' | 'clock') & aiModel fallback
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('portal_theme') || 'light';
  });
  const [aiModel, setAiModel] = useState(() => {
    return localStorage.getItem('portal_ai_model') || 'none';
  });
  const [clockEffectiveTheme, setClockEffectiveTheme] = useState('light');

  // Calculate clock theme (6:00 to 18:00 is light, 18:00 to 6:00 is dark)
  const getClockTheme = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  };

  const effectiveTheme = themeMode === 'clock' ? clockEffectiveTheme : themeMode;

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
    // 1. Fetch our local registration database
    const users = JSON.parse(localStorage.getItem('portal_users')) || {};

    // 2. Standard hardcoded Admin fallback for testing
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      setIsLoggedIn(true);
      setIsAdmin(true);
      setCurrentUser('Admin');
      return { success: true };
    }

    // 3. Verify registered users in database
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 m-0 p-0 transition-colors duration-200">
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
          <Dashboard />
        </>
      )}
    </div>
  );
}

export default App;