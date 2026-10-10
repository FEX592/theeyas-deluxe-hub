import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, bootstrapState } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await login(email.trim());
      const stored = localStorage.getItem('tdh_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role === 'admin' || u.role === 'owner') {
          navigate('/admin');
          return;
        }
      }
      navigate('/account');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 md:py-24">
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-2xl text-white">
              Sign In to Your Account
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Access your purchased WhatsApp community links and order history.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-black" />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </div>
          </form>

          {bootstrapState && !bootstrapState.claimed && (
            <div className="mt-6 p-3.5 rounded-xl bg-[#0B0F17] border border-[#FACC15]/40 text-xs text-white text-center">
              <span>First deployment? </span>
              <Link to="/setup/owner" className="font-bold underline text-[#FACC15]">
                Establish Initial Owner
              </Link>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#1F2637] text-center text-xs text-[#9CA3AF]">
            <span>Don't have an account yet? </span>
            <Link to="/signup" className="text-[#FACC15] font-semibold hover:underline">
              Register Customer Account
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
