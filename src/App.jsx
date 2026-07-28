import React, { useState } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

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
    <div className="min-h-screen bg-gray-50 text-gray-800 m-0 p-0">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <Navbar isAdmin={isAdmin} username={currentUser} onLogout={handleLogout} />
          <Dashboard />
        </>
      )}
    </div>
  );
}

export default App;