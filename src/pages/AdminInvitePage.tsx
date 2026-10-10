import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Users, AlertCircle } from 'lucide-react';

export const AdminInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email.trim()) {
      setError('Please provide your assigned email address.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.redeemInvite(token, email.trim(), displayName.trim());
      if (res.success) {
        localStorage.setItem('tdh_user', JSON.stringify(res.profile));
        await refresh();
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to redeem administrator invitation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 md:py-24">
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-center text-[#FACC15] mx-auto mb-3">
              <Users className="w-6 h-6 text-[#FACC15]" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-white">
              Accept Admin Invite
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              You have been invited to join the administrative team of THEEYA'S DELUXE HUB.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Your Email Address <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="colleague@theeyasdeluxehub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Display Name <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Adeola Balogun"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Verifying Invite...' : 'Accept Invitation & Enter'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};
