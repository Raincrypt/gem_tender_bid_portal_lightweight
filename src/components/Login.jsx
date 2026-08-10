import { useState } from 'react';
import { Lock, User, AlertCircle, UserPlus, LogIn, CheckCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegisterMode) {
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match!");
        return;
      }
      
      if (username.toLowerCase() === 'admin') {
        setErrorMsg("The username 'admin' is reserved for system defaults.");
        return;
      }

      const users = JSON.parse(localStorage.getItem('portal_users')) || {};
      
      if (users[username]) {
        setErrorMsg("Username already exists! Choose another name.");
        return;
      }

      users[username] = password;
      localStorage.setItem('portal_users', JSON.stringify(users));
      
      setSuccessMsg("Registration successful! You can now sign in.");
      setIsRegisterMode(false); 
      setPassword('');
      setConfirmPassword('');
    } else {
      const status = onLogin(username, password);
      if (status && !status.success) {
        setErrorMsg(status.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#003874] to-[#001d3d] dark:from-gray-950 dark:to-slate-900 px-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 transition-all">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#003874]/10 dark:bg-blue-950/70 text-[#003874] dark:text-blue-400 mb-3">
            {isRegisterMode ? <UserPlus size={30} /> : <Lock size={30} />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">GeM Bid Portal</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRegisterMode ? 'Create New Member Credentials' : 'Secure Extraction & Verification Dashboard'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded text-sm flex items-start space-x-2">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/50 border-l-4 border-green-500 text-green-700 dark:text-green-300 rounded text-sm flex items-start space-x-2">
            <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#003874] dark:focus:ring-blue-500 focus:border-[#003874] dark:focus:border-blue-500 outline-none transition text-sm"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#003874] dark:focus:ring-blue-500 focus:border-[#003874] dark:focus:border-blue-500 outline-none transition text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#003874] dark:focus:ring-blue-500 focus:border-[#003874] dark:focus:border-blue-500 outline-none transition text-sm"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#003874] hover:bg-[#002855] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow shadow-[#003874]/20 hover:shadow-lg transition duration-150 text-sm mt-2 flex items-center justify-center space-x-2"
          >
            {isRegisterMode ? <UserPlus size={16} /> : <LogIn size={16} />}
            <span>{isRegisterMode ? 'Complete Registration' : 'Sign In to Portal'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs font-semibold text-[#003874] dark:text-blue-400 hover:text-[#002855] dark:hover:text-blue-300 transition"
          >
            {isRegisterMode ? 'Already have an account? Sign In' : 'Need an account? Register Here'}
          </button>
        </div>
      </div>
    </div>
  );
}