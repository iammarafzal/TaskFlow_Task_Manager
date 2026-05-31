import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Settings, LogOut, Menu, X, Hexagon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const NavLinks = () => (
    <div className="flex flex-col space-y-1">
      <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Menu</div>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "sidebar-item-active text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
            )
          }
        >
          <item.icon className="w-5 h-5" />
          {item.name}
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#090d16] text-slate-400 flex selection:bg-blue-500/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.06] bg-[#111726] flex-col shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 text-slate-100 font-semibold tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">T</div>
            <span className="text-xl">TaskFlow</span>
          </div>
        </div>

        <div className="flex-1 py-6 px-2">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="bg-[#0d121f] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-100 truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 w-full h-16 border-b border-white/[0.06] bg-[#090d16]/80 backdrop-blur-md z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-slate-100 font-semibold tracking-tight">
          <Hexagon className="w-5 h-5 text-blue-500" />
          <span>TaskFlow</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#090d16] border-r border-white/[0.06] flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-100 font-semibold tracking-tight">
                  <Hexagon className="w-5 h-5 text-blue-500" />
                  <span>TaskFlow</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-4">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-white/[0.06]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm text-rose-400 font-medium hover:bg-rose-500/10 border border-rose-500/20 rounded-md transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#090d16]">
        <div className="pt-16 md:pt-0 w-full h-full flex flex-col overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
