import React from 'react';
import { ShieldAlert, UserCheck, LogOut, User } from 'lucide-react';

export default function Navbar({ isAdmin, username, onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Portal Logo Group */}
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-black tracking-wider select-none">GeM</div>
          <span className="text-lg font-bold text-gray-900 border-l pl-3 border-gray-300">Bid Intelligent Extraction</span>
        </div>
        
        {/* Dynamic Context Parameters & Controls */}
        <div className="flex items-center space-x-5">
          
          {/* Active Persona Identification Label */}
          <div className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            <User size={15} className="text-gray-400" />
            <span>Hello, <strong className="text-gray-900">{username || 'User'}</strong></span>
          </div>

          {/* Role Status Tag */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border ${
            isAdmin ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {isAdmin ? <ShieldAlert size={15} /> : <UserCheck size={15} />}
            <span>{isAdmin ? 'ADMIN ACCESS' : 'STANDARD WORKER'}</span>
          </div>

          {/* Divider Line */}
          <span className="h-5 w-px bg-gray-200" />

          {/* Action trigger button */}
          <button 
            onClick={onLogout}
            className="flex items-center space-x-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors py-1.5 px-2 rounded-md hover:bg-gray-50"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}