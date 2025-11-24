
import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { StylistView } from './views/StylistView';
import { SavedOutfitsView } from './views/SavedOutfitsView';

const Header: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl">V</div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900 hidden sm:block">Virtual Stylist</h1>
        </Link>
        
        <nav className="flex items-center gap-1">
          <Link 
            to="/" 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            Estilista
          </Link>
          <Link 
            to="/saved" 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive('/saved') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <svg className={`w-4 h-4 ${isActive('/saved') ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Looks Salvos
          </Link>
        </nav>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<StylistView />} />
            <Route path="/saved" element={<SavedOutfitsView />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
