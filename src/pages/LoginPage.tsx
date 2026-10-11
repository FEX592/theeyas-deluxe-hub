import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { AuthLayout } from '../components/AuthLayout.tsx';
import { AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const profile = await login(email.trim(), password);
      const next = new URLSearchParams(location.search).get('next');
      navigate(next || (profile.role === 'admin' || profile.role === 'owner' ? '/admin' : '/'), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in to your account" description="Pick up right where you left off in the hub.">
      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-3.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
          />
        </div>
        <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F1D48E] to-[#D6B36A] px-4 py-3.5 text-sm font-bold text-[#211A10] shadow-[0_8px_24px_rgba(214,179,106,0.16)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
          <LockKeyhole className="h-4 w-4" />
          {loading ? 'Signing in…' : 'Sign in'}
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#62616A]">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span>Member sign-in</span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>
      <p className="text-center text-sm text-[#92919B]">
        New to the hub? <Link to="/signup" className="font-semibold text-[#E5C782] transition hover:text-white">Create an account</Link>
      </p>
    </AuthLayout>
  );
};
