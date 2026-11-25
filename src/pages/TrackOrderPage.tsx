import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Search, CheckCircle2, Clock, AlertCircle, MessageSquare, Loader2, RefreshCw } from 'lucide-react';

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<{ access_url: string; fulfilled_at: string } | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !identifier.trim()) {
      setError('Please provide both your Order ID and your email or tracking token.');
      return;
    }

    setLoading(true);
    setError(null);
    setTrackedOrder(null);
    setFulfillment(null);

    try {
      const res = await api.trackOrder(orderId.trim(), identifier.trim());
      setTrackedOrder(res.order);
      setFulfillment(res.fulfillment);
    } catch (err: any) {
      setError(err.message || 'No matching order found. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverify = async () => {
    if (!trackedOrder?.payment_reference) {
      setError('No Paystack transaction reference is attached to this order.');
      return;
    }
    setReverifying(true);
    setError(null);
    try {
      const result = await api.verifyPayment(trackedOrder.payment_reference);
      const refreshed = await api.trackOrder(orderId.trim(), identifier.trim());
      setTrackedOrder(refreshed.order);
      setFulfillment(refreshed.fulfillment);
      if (!result.success) setError(result.message || 'Paystack has not confirmed this transaction yet.');
    } catch (err: any) {
      setError(err.message || 'Payment could not be re-verified. Please try again.');
    } finally {
      setReverifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]"
    >
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xl mx-auto mb-10"
        >
          <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
            Order Verification
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Track Your WhatsApp Group or Channel Order
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-2">
            Enter your Order ID and purchase email to check your payment and retrieve your WhatsApp Group or Channel invitation link.
          </p>
        </motion.div>

        {/* Lookup Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-8 shadow-xl mb-8"
        >
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Order ID <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TDH-104928"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                Verification Factor (Customer Email or Tracking Token) <span className="text-[#FACC15]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. adeola@example.com or tracking token"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
              />
              <span className="text-[11px] text-[#6B7280] mt-1 block">
                Required to protect your WhatsApp Group or Channel invitation link.
              </span>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-black" />
                  <span>Verify and Track Order</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Result Area */}
        {trackedOrder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Top meta row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[#9CA3AF] font-mono block mb-1">
                  Order ID: {orderId}
                </span>
                {trackedOrder && (
                  <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                    trackedOrder.order_status === 'completed'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800'
                  }`}>
                    {trackedOrder.order_status.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </div>
              {trackedOrder && (
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={reverifying}
                  onClick={handleReverify}
                  className="px-4 py-2 text-xs font-bold text-[#FACC15] hover:text-[#EAB308] underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reverifying ? 'Re-verifying…' : 'Re-verify Payment'}
                </motion.button>
              )}
            </div>

            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center animate-pulse"
              >
                <p className="text-xs text-[#9CA3AF]">Loading order information...</p>
              </motion.div>
            ) : !trackedOrder ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center"
              >
                <h2 className="font-bold text-base text-white mb-2">Order Not Found</h2>
                <p className="text-xs text-[#9CA3AF] mb-4">We could not retrieve details for this order ID.</p>
                <Link to="/marketplace" className="text-xs font-bold text-[#FACC15] underline">
                  Browse Marketplace
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {/* Fulfillment Card */}
                {fulfillment && trackedOrder.order_status === 'completed' ? (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-[#111622] rounded-2xl border border-[#FACC15]/40 p-6 sm:p-8 shadow-xl space-y-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                      <span>Verified WhatsApp Invitation Link</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-white">
                      WhatsApp Invitation Ready for {trackedOrder.listing_snapshot.name}
                    </h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      Your purchase is confirmed and your WhatsApp Group or Channel invitation link is ready. Click below to join.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <motion.a
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        href={fulfillment.access_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-sm rounded-xl shadow-md inline-flex items-center gap-2 transition-transform hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-4 h-4 text-black" />
                        <span>Join Your WhatsApp Group or Channel</span>
                      </motion.a>
                    </div>
                  </motion.div>
                ) : trackedOrder.payment_status === 'paid' ? (
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#111622] rounded-2xl border border-amber-800 p-6 text-xs text-amber-300 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Clock className="w-4 h-4 text-[#FACC15]" />
                      <span>Payment Verified — Preparing Your WhatsApp Invitation Link</span>
                    </div>
                    <p className="text-[#9CA3AF]">
                      Your payment has been confirmed. Our team is finalizing your private invitation link. Once verified, it will appear here and in your inbox.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 text-xs text-[#9CA3AF] space-y-1"
                  >
                    <span className="font-bold text-white block">Awaiting Payment Confirmation</span>
                    <p>Payment has not yet settled. Once confirmed by Paystack, your order will proceed to fulfillment.</p>
                  </motion.div>
                )}

                {/* Order Specification Summary */}
                <motion.div
                  whileHover={{ shadow: '0 0 24px rgba(214, 179, 106, 0.12)' }}
                  className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 space-y-4 shadow-xl"
                >
                  <h3 className="font-display font-semibold text-xs tracking-wider uppercase text-[#9CA3AF]">
                    Item Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#6B7280] block">Community Name</span>
                      <span className="font-bold text-white mt-0.5 block">{trackedOrder.listing_snapshot.name}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Type</span>
                      <span className="font-semibold text-white mt-0.5 block">
                        {trackedOrder.listing_snapshot.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Amount</span>
                      <span className="font-bold text-[#FACC15] font-mono tabular-nums mt-0.5 block">
                        ₦{(trackedOrder.amount_kobo / 100).toLocaleString('en-NG')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Payment Gateway</span>
                      <span className="font-semibold text-white mt-0.5 block">Paystack</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </motion.div>
  );
};
