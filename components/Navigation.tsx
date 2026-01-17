
import React from 'react';
import { AppState } from '../types';

interface NavigationProps {
  current: AppState;
  setPage: (page: AppState) => void;
}

const Navigation: React.FC<NavigationProps> = ({ current, setPage }) => {
  const items = [
    { id: 'HOME', icon: '🏠', label: 'ホーム' },
    { id: 'LEARN', icon: '📖', label: 'がくしゅう' },
    { id: 'TEST', icon: '📝', label: 'テスト' },
    { id: 'REVIEW', icon: '📊', label: 'きろく' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-pink-100 px-6 py-3 flex justify-around items-center z-50">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id as AppState)}
          className={`flex flex-col items-center transition-all duration-300 ${
            current === item.id ? 'text-pink-500 scale-110' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="text-[10px] font-bold mt-1">{item.label}</span>
          {current === item.id && (
            <div className="w-1 h-1 bg-pink-500 rounded-full mt-1"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
