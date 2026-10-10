import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ArrowLeft, Shield, Check } from 'lucide-react';

export const AccountSecurityPage: React.FC = () => {
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="mb-8">
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308] mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Account</span>
          </Link>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Security Settings
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Manage your credentials and authentication security.
          </p>
        </div>

        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-[#1F2637]">
            <div className="w-10 h-10 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-center text-[#FACC15]">
              <Shield className="w-5 h-5 text-[#FACC15]" />
            </div>
            <div>
              <span className="text-xs text-[#6B7280] block">Verified Account Email</span>
              <span className="font-mono text-sm font-semibold text-white">{profile?.email}</span>
            </div>
          </div>

          {saved && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Password updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};
