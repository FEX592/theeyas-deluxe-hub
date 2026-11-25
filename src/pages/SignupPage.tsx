import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { AuthLayout } from '../components/AuthLayout.tsx';
import { AlertCircle, ArrowRight, UserRoundPlus } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await signup(email.trim(), displayName.trim(), password);
      navigate(result.firstAccount ? '/admin' : '/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Join the hub" title="Create your account" description="Set up your profile to explore the marketplace.">
      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-3.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Full name</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Email address</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="signup-password" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Password</label>
            <input
              id="signup-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
            />
          </div>
          <div>
            <label htmlFor="signup-confirm" className="mb-2 block text-xs font-semibold text-[#D5D2DC]">Confirm password</label>
            <input
              id="signup-confirm"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full rounded-xl border border-white/10 bg-[#0B0C12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#555560] focus:border-[#D6B36A]/70 focus:ring-4 focus:ring-[#D6B36A]/10"
            />
          </div>
        </div>
        <p className="-mt-1 text-[11px] leading-5 text-[#777681]">Use at least 8 characters. The first account becomes the store administrator.</p>
        <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F1D48E] to-[#D6B36A] px-4 py-3.5 text-sm font-bold text-[#211A10] shadow-[0_8px_24px_rgba(214,179,106,0.16)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
          <UserRoundPlus className="h-4 w-4" />
          {loading ? 'Creating account…' : 'Create account'}
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#92919B]">
        Already have an account? <Link to="/login" className="font-semibold text-[#E5C782] transition hover:text-white">Sign in</Link>
      </p>
    </AuthLayout>
  );
};
