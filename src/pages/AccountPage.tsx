import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { User, Package, ArrowRight, LogOut, Key, Trash2, AlertCircle } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout, deleteAccount } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePhrase !== 'DELETE') {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      navigate('/', { replace: true });
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
      setDeleting(false);
    }
  };

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]"
      >
        <Header />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
          <motion.div
            whileTap={{ scale: 0.97 }}
            asChild
            className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl"
          >
            <h2 className="font-display font-bold text-xl text-white mb-2">Sign In Required</h2>
            <p className="text-xs text-[#9CA3AF] mb-4">Please log in to review your profile and WhatsApp Group or Channel orders.</p>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} asChild>
              <Link to="/login" className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block">
                Go to Sign In
              </Link>
            </motion.div>
          </motion.div>
        </main>
        <Footer />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]"
    >
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#1F2637]"
        >
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

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-red-400 bg-[#111622] border border-red-900/50 hover:bg-red-950/40 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 space-y-4 shadow-xl"
          >
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
          </motion.div>

          {/* Orders History List */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="md:col-span-2 bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FACC15]" />
                <span>My WhatsApp Group & Channel Orders</span>
              </h3>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF] animate-pulse">
                <p>Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF]">
                <p>No orders yet. Browse the marketplace to get started.</p>
                <Link to="/marketplace" className="text-[#FACC15] font-semibold hover:text-white ml-2 inline-block">
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#1F2637]">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    whileHover={{ x: 4 }}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{order.order_number}</span>
                        <span className={`text-[10px] ${
                          order.order_status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800'
                        } font-semibold px-2 py-0.5 rounded`}>
                          {order.order_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-[#9CA3AF] block mt-0.5">
                        {order.listing_snapshot.name} · ₦{(order.amount_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-xs font-bold text-[#FACC15] hover:text-[#EAB308] underline shrink-0"
                    >
                      View Details
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Account Actions */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="md:col-span-1 bg-[#111622] rounded-2xl border border-[#1F2637] p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-center text-[#FACC15]">
                <Trash2 className="w-5 h-5 text-[#FACC15]" />
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block">Danger Zone</span>
                <span className="text-xs text-red-400 block">Permanent actions</span>
              </div>
            </div>

            {showDelete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 max-w-md space-y-3"
              >
                {deleteError && <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{deleteError}</div>}
                <label className="block text-xs text-[#9CA3AF]">
                  Current password
                  <input type="password" required autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-1 w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white" />
                </label>
                <label className="block text-xs text-[#9CA3AF]">
                  Type <span className="font-mono font-bold text-white">DELETE</span> to confirm
                  <input type="text" required value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} className="mt-1 w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white" />
                </label>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    type="button" disabled={deleting} onClick={() => { setShowDelete(false); setDeletePassword(''); setDeletePhrase(''); setDeleteError(null); }}
                    className="px-4 py-2 text-xs font-semibold text-white border border-[#1E2638] rounded-xl disabled:opacity-60"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit" disabled={deleting || deletePhrase !== 'DELETE'}
                    className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-600 rounded-xl disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Permanently Delete Account'}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDelete(true)}
                className="w-full py-3 text-xs font-bold text-red-400 hover:text-red-300 underline transition-colors cursor-pointer text-left"
              >
                Delete Account
              </motion.button>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};
