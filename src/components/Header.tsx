import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, User, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const { profile, isAdmin, bootstrapState } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0D14]/90 backdrop-blur-md border-b border-[#1F2637]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-20">
          {/* Zone 1: Official Logo matching Brand Board */}
          <Link
            to="/"
            className="flex items-center gap-3 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 group"
          >
            <img
              src="/brand-mark.svg"
              alt="THEEYA'S DELUXE HUB"
              className="h-10 w-auto group-hover:brightness-110 transition-all"
            />
          </Link>

          {/* Zone 2: 4–5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            <Link
              to="/"
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                isActive('/') && location.pathname === '/' ? 'text-white font-semibold' : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                isActive('/marketplace') ? 'text-white font-semibold' : ''
              }`}
            >
              Marketplace
            </Link>
            <Link
              to="/track-order"
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                isActive('/track-order') ? 'text-white font-semibold' : ''
              }`}
            >
              Track Order
            </Link>
            {isAdmin ? (
              <Link
                to="/admin"
                className={`hover:text-[#FACC15] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isActive('/admin') ? 'text-[#FACC15] font-semibold' : 'text-[#D6B36A]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#FACC15]" />
                Admin Console
              </Link>
            ) : profile ? (
              <Link
                to="/account"
                className={`hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isActive('/account') ? 'text-white font-semibold' : ''
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Account
              </Link>
            ) : null}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {bootstrapState && !bootstrapState.claimed ? (
              <Link
                to="/setup/owner"
                className="px-4 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all whitespace-nowrap shrink-0 shadow-md"
              >
                Claim Owner Setup
              </Link>
            ) : (
              <Link
                to="/marketplace"
                className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all whitespace-nowrap shrink-0 shadow-md"
              >
                Browse Marketplace
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-[#161C2C] rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#1F2637] space-y-2 bg-[#0A0D14]">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-white hover:bg-[#161C2C] rounded-lg"
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-white hover:bg-[#161C2C] rounded-lg"
            >
              Marketplace
            </Link>
            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-white hover:bg-[#161C2C] rounded-lg"
            >
              Track Order
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-[#FACC15] hover:bg-[#161C2C] rounded-lg"
              >
                Admin Console
              </Link>
            )}
            {profile ? (
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-white hover:bg-[#161C2C] rounded-lg"
              >
                Account Profile
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-[#FACC15] hover:bg-[#161C2C] rounded-lg"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
