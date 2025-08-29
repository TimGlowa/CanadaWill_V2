import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Logo from '../Logo';

const Header: React.FC = () => {
  const location = useLocation();
  
  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3">
            <Logo className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">CanadaWill</h1>
              <p className="text-xs text-gray-600">Politician Stance Tracker</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActiveRoute('/')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <HomeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            
            <Link
              to="/about"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActiveRoute('/about')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <InformationCircleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 