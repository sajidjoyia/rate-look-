
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusSquare, User, Star, LogOut, ShieldCheck } from 'lucide-react';
import { Profile } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface NavbarProps {
  profile: Profile;
}

const Navbar: React.FC<NavbarProps> = ({ profile }) => {
  const location = useLocation();

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    window.location.reload();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/create', icon: PlusSquare, label: 'Post' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/admin', icon: ShieldCheck, label: 'Admin' },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 h-16 items-center px-6 justify-between shadow-sm">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          LensCritique
        </Link>
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 font-medium transition-colors ${
                location.pathname === item.path ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-semibold">
              <Star size={14} fill="currentColor" />
              {profile.posts_remaining_to_unlock > 0 ? `${profile.posts_remaining_to_unlock} Reviews Left` : 'Unlocked'}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex items-center justify-around h-16 px-4 pb-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
          <LogOut size={24} />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </nav>

      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 bg-white border-b border-slate-100 z-40 flex items-center justify-between px-4 py-3">
        <span className="text-xl font-bold text-indigo-600">LC</span>
        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-semibold">
          <Star size={12} fill="currentColor" />
          {profile.posts_remaining_to_unlock > 0 ? `${profile.posts_remaining_to_unlock} to post` : 'Ready'}
        </div>
      </div>
    </>
  );
};

export default Navbar;
