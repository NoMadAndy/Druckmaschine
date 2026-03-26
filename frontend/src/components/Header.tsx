import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Menu, Wifi, WifiOff, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/ai-agents': 'AI Agents',
  '/trading': 'Trading',
  '/logs': 'System Logs',
  '/changelog': 'Changelog',
  '/settings': 'Settings',
};

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const { status } = useWebSocket();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derive page title
  const pathBase = '/' + location.pathname.split('/').filter(Boolean)[0] || '/';
  const title = pageTitles[location.pathname] || pageTitles[pathBase] || 'Druckmaschine';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/[0.06] bg-dark-800/60 backdrop-blur-xl shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-100">{title}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">
            {location.pathname === '/' ? 'System overview and quick actions' : `Manage your ${title.toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className={cn('relative transition-all duration-300', searchOpen ? 'w-64' : 'w-auto')}>
          {searchOpen ? (
            <div className="flex items-center">
              <input
                autoFocus
                className="glass-input w-full text-sm pr-8"
                placeholder="Search..."
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              />
              <Search className="w-4 h-4 text-gray-500 absolute right-3" />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* WebSocket status */}
        <div
          className={cn(
            'p-2 rounded-lg transition-colors',
            status === 'connected' ? 'text-emerald-400' : status === 'connecting' ? 'text-amber-400 animate-pulse' : 'text-gray-600'
          )}
          title={`WebSocket: ${status}`}
        >
          {status === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-card p-1 animate-slide-down z-50">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-gray-200">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  window.location.href = '/settings';
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] rounded-md transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  clearAuth();
                  window.location.href = '/login';
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
