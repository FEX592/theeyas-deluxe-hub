import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import {
  LayoutDashboard,
  Layers,
  FolderTree,
  ShoppingBag,
  CreditCard,
  Mail,
  FileCode,
  ListOrdered,
  Users,
  ShieldCheck,
  Settings,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle, actions }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.getHealth().then(setHealthStatus).catch(console.error);
  }, [location.pathname]);

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Listings', path: '/admin/listings', icon: Layers },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Orders Queue', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Payment Settings', path: '/admin/payments', icon: CreditCard },
    { label: 'Email Automation', path: '/admin/emails', icon: Mail },
    { label: 'HTML Templates', path: '/admin/emails/templates', icon: FileCode },
    { label: 'Email Delivery Logs', path: '/admin/emails/logs', icon: ListOrdered },
    { label: 'Administrators', path: '/admin/admins', icon: Users },
    { label: 'Audit Log', path: '/admin/audit-log', icon: ShieldCheck },
    { label: 'Store Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F3F4F6] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0D111A] text-white p-4 flex items-center justify-between border-b border-[#1F2637]">
        <Link to="/admin" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="TDH" className="w-7 h-7 rounded-lg" />
          <span className="font-display font-bold text-sm tracking-wider text-white">ADMIN CONSOLE</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white hover:bg-[#161C2C] rounded-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Admin Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 bg-[#0D111A] text-[#F3F4F6] flex flex-col justify-between border-r border-[#1F2637] transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Workspace Brand Lockup */}
          <div className="pb-6 mb-4 border-b border-[#1F2637]">
            <Link to="/admin" className="block">
              <img src="/brand-mark.svg" alt="THEEYA'S DELUXE HUB" className="h-8 w-auto" />
              <span className="text-[10px] text-[#9CA3AF] font-bold tracking-widest uppercase block mt-1.5">
                Admin Console
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#161C2C] text-[#FACC15] border border-[#FACC15]/30 shadow-sm'
                      : 'text-[#9CA3AF] hover:bg-[#161C2C]/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FACC15]' : 'text-[#6B7280]'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Operational Status Pill */}
          {healthStatus && (
            <div className="mt-8 p-3 rounded-xl bg-[#0B0F17] border border-[#1E2638] text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span>Email Outbox</span>
                <span className="font-mono font-semibold text-white">
                  {healthStatus.outbox_pending_jobs} queued
                </span>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span>Gateway</span>
                <span className="text-[#10B981] font-semibold">Paystack Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions in Sidebar */}
        <div className="p-4 border-t border-[#1F2637] bg-[#0A0D14] space-y-2">
          <Link
            to="/marketplace"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#FACC15] hover:bg-[#161C2C] rounded-lg transition-colors"
          >
            <span>Live Storefront</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <div className="flex items-center justify-between pt-2 border-t border-[#1F2637] text-xs text-[#9CA3AF]">
            <span className="truncate max-w-[130px] font-mono text-[11px]">
              {profile?.email || 'Admin'}
            </span>
            <button
              onClick={handleLogout}
              className="text-[#9CA3AF] hover:text-white p-1 rounded cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#0A0D14]">
        {/* Workspace Top Toolbar */}
        <header className="bg-[#111622] border-b border-[#1F2637] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-xl text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">{actions}</div>
        </header>

        {/* Page Inner Container */}
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
};
