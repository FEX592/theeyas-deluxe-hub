import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { User, Package, ArrowRight, LogOut, Key } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    api
      .getAdminOrders()
      .then((all) => {
        const myOrders = all.filter(
          (o) => o.customer_email.toLowerCase() === profile.email.toLowerCase()
        );
        setOrders(myOrders);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
        <Header />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
            <h2 className="font-display font-bold text-xl text-white mb-2">Sign In Required</h2>
            <p className="text-xs text-[#9CA3AF] mb-4">Please log in to review your profile and purchased access links.</p>
            <Link to="/login" className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block">
              Go to Sign In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#1F2637]">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Customer Account
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Signed in as <span className="font-semibold text-white font-mono">{profile.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/account/security"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#111622] border border-[#1F2637] hover:border-[#FACC15] rounded-xl inline-flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Security Settings</span>
            </Link>

            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-red-400 bg-[#111622] border border-red-900/50 hover:bg-red-950/40 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0B0F17] border border-[#1E2638] flex items-center justify-center text-[#FACC15]">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-white">{profile.display_name}</h3>
                <span className="text-[11px] text-[#9CA3AF] block font-mono">{profile.role.toUpperCase()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1F2637] space-y-2 text-xs text-[#9CA3AF]">
              <div className="flex justify-between">
                <span>Account Role:</span>
                <span className="font-medium text-white capitalize">{profile.role}</span>
              </div>
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="font-mono text-white">{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Orders History List */}
          <div className="md:col-span-2 bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FACC15]" />
                <span>My Community Access Orders</span>
              </h3>
              <span className="text-xs text-[#9CA3AF] font-mono">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#6B7280] animate-pulse">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-[#9CA3AF]">You have not placed any orders under this email address yet.</p>
                <Link
                  to="/marketplace"
                  className="px-4 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block"
                >
                  Explore Marketplace
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#1F2637]">
                {orders.map((ord) => (
                  <div key={ord.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xs text-white">
                          {ord.listing_snapshot.name}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          ord.order_status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800'
                        }`}>
                          {ord.order_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF] font-mono mt-0.5 block">
                        {ord.order_number} · ₦{(ord.amount_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>

                    <Link
                      to={`/orders/${ord.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-[#FACC15] hover:bg-[#161C2C] border border-[#1E2638] rounded-xl inline-flex items-center gap-1 transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
