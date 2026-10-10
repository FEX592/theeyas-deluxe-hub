import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SetupOwnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { bootstrapState, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  if (bootstrapState?.claimed) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
        <Header />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-2">
              Owner Already Established
            </h1>
            <p className="text-xs text-[#9CA3AF] mb-6 leading-relaxed">
              The initial store owner account for THEEYA'S DELUXE HUB has already been securely claimed. This setup route is closed.
            </p>
            <Link
              to="/login"
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block"
            >
              Go to Admin Sign In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid owner email.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.claimBootstrap(email.trim(), displayName.trim() || 'Store Owner', secret.trim());
      if (res.success) {
        setSuccess(true);
        localStorage.setItem('tdh_user', JSON.stringify(res.profile));
        await refresh();
        setTimeout(() => {
          navigate('/admin');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Owner claim failed.');
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
              <ShieldCheck className="w-6 h-6 text-[#FACC15]" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-white">
              Initial Owner Bootstrap
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Claim initial administrator authority for THEEYA'S DELUXE HUB. This procedure can only be executed once.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 text-center">
              Owner established successfully. Redirecting to workspace...
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Owner Email Address <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. owner@theeyasdeluxehub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Chief Administrator"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Deployment Bootstrap Secret (Optional)
              </label>
              <input
                type="password"
                placeholder="Enter TDH_OWNER_BOOTSTRAP_SECRET if set"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
              <span className="text-[11px] text-[#6B7280] mt-1 block">
                Required only if TDH_OWNER_BOOTSTRAP_SECRET is specified in environment.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-black" />
                <span>{submitting ? 'Claiming Owner Authority...' : 'Establish Owner Account'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};
