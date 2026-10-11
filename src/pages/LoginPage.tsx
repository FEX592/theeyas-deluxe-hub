import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Lock, AlertCircle } from 'lucide-react';

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
    setLoading(true); setError(null);
    try {
      const profile = await login(email.trim(), password);
      const next = new URLSearchParams(location.search).get('next');
      navigate(next || (profile.role === 'admin' || profile.role === 'owner' ? '/admin' : '/'), { replace: true });
    } catch (err: any) { setError(err.message || 'Login failed'); } finally { setLoading(false); }
  };

  return <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]"><Header /><main className="flex-1 max-w-md w-full mx-auto px-4 py-16 md:py-24"><div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl"><div className="text-center mb-6"><h1 className="font-display font-extrabold text-2xl text-white">Sign In to THEEYA'S DELUXE HUB</h1><p className="text-xs text-[#9CA3AF] mt-2">Sign in to access the marketplace and your account.</p></div>{error && <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}<form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Email Address</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white" /></div><div><label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Password</label><input type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white" /></div><button type="submit" disabled={loading} className="w-full py-3.5 text-sm font-bold text-black bg-[#FACC15] rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"><Lock className="w-4 h-4" />{loading ? 'Signing in...' : 'Sign In'}</button></form><div className="mt-6 pt-6 border-t border-[#1F2637] text-center text-xs text-[#9CA3AF]">New here? <Link to="/signup" className="text-[#FACC15] font-semibold hover:underline">Create an account</Link></div></div></main><Footer /></div>;
};
