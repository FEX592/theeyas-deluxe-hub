import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Shield, HelpCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const Footer: React.FC = () => {
  const { bootstrapState } = useAuth();

  return (
    <footer className="bg-[#0A0D14] text-[#F3F4F6] border-t border-[#1F2637]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img src="/brand-mark.svg" alt="THEEYA'S DELUXE HUB" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-[#9CA3AF] leading-relaxed max-w-md">
              THEEYA'S DELUXE HUB is a marketplace where you can browse and buy WhatsApp Groups and Channels.
            </p>
            <div className="flex items-center gap-4 text-xs text-[#D6B36A] pt-2">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Verified WhatsApp Links
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp Group & Channel Orders
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-xs tracking-wider uppercase text-[#D6B36A]">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-[#9CA3AF]">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Marketplace Catalogue
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Track Existing Order
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Admin */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-xs tracking-wider uppercase text-[#D6B36A]">
              Support & Inquiries
            </h4>
            <ul className="space-y-2 text-sm text-[#9CA3AF]">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FACC15]" />
                <a href="mailto:support@theeyasdeluxehub.com" className="hover:text-white transition-colors">
                  support@theeyasdeluxehub.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#FACC15]" />
                <span className="text-[#6B7280]">Mon – Fri (9am – 6pm WAT)</span>
              </li>
              {bootstrapState && !bootstrapState.claimed && (
                <li className="pt-2">
                  <Link
                    to="/setup/owner"
                    className="inline-flex items-center gap-1 text-xs text-[#FACC15] underline hover:text-white transition-colors font-medium"
                  >
                    Initial Owner Setup Flow
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1F2637] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>© {new Date().getFullYear()} THEEYA'S DELUXE HUB. All rights reserved.</p>
          <p>Shop curated WhatsApp Groups and Channels.</p>
        </div>
      </div>
    </footer>
  );
};
