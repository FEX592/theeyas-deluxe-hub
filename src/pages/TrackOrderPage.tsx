import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { Search, CheckCircle2, Clock, AlertCircle, MessageSquare, Loader2 } from 'lucide-react';

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
            Order Verification
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Track Your WhatsApp Group or Channel Order
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-2">
            Enter your Order ID and purchase email to check your payment and retrieve your WhatsApp Group or Channel invitation link.
          </p>
        </div>

        {/* Lookup Card */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-8 shadow-xl mb-8">
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
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
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
            </button>
          </form>
        </div>

        {/* Result Area */}
        {trackedOrder && (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-8 shadow-xl space-y-8 animate-fadeIn">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1F2637]">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#6B7280] font-medium block">
                  Order Status
                </span>
                <h2 className="font-display font-bold text-xl text-white mt-0.5">
                  {trackedOrder.order_status.replace('_', ' ').toUpperCase()}
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-[#9CA3AF] block font-mono">
                  {trackedOrder.order_number}
                </span>
                <span className="font-display font-bold text-base text-[#FACC15] font-mono tabular-nums">
                  ₦{(trackedOrder.amount_kobo / 100).toLocaleString('en-NG')}
                </span>
              </div>
            </div>

            {/* Timeline Progress */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider block">
                Fulfillment Timeline
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>01. Created</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">Order recorded</span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    trackedOrder.payment_status === 'paid'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-800 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {trackedOrder.payment_status === 'paid' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>02. Payment</span>
                  </div>
                  <span className="text-[10px]">
                    {trackedOrder.payment_status === 'paid' ? 'Paystack confirmed' : 'Awaiting payment'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    trackedOrder.order_status === 'completed' || trackedOrder.order_status === 'processing'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-[#0B0F17] border-[#1E2638] text-[#9CA3AF]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {trackedOrder.order_status === 'completed' || trackedOrder.order_status === 'processing' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>03. Fulfillment</span>
                  </div>
                  <span className="text-[10px]">Link allocation</span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    trackedOrder.order_status === 'completed'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-[#0B0F17] border-[#1E2638] text-[#9CA3AF]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {trackedOrder.order_status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>04. Delivered</span>
                  </div>
                  <span className="text-[10px]">
                    {trackedOrder.order_status === 'completed' ? 'Invitation live' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivered Access Link */}
            {fulfillment && trackedOrder.order_status === 'completed' ? (
              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#FACC15]/40 text-center space-y-3">
                <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block">
                  Verified WhatsApp Invitation Link
                </span>
                <p className="text-xs text-[#9CA3AF]">
                  Your WhatsApp Group or Channel invitation for <strong className="text-white">{trackedOrder.listing_snapshot.name}</strong> is ready.
                </p>
                <div className="pt-2">
                  <a
                    href={fulfillment.access_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-sm rounded-xl shadow-md inline-flex items-center gap-2 transition-transform hover:scale-[1.02]"
                  >
                    <MessageSquare className="w-4 h-4 text-black" />
                    <span>Join Your WhatsApp Group or Channel</span>
                  </a>
                </div>
                <p className="text-[11px] text-[#6B7280] pt-1">
                  Fulfilled at: {new Date(fulfillment.fulfilled_at).toLocaleString('en-GB')}
                </p>
              </div>
            ) : trackedOrder.payment_status === 'paid' ? (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-xs text-amber-300 space-y-1">
                <span className="font-bold block">Fulfillment in Progress</span>
                <p>
                  Your payment is verified. Our administrator is attaching your verified WhatsApp invite link. You will receive an email as soon as it is released.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] text-xs text-[#9CA3AF] space-y-1">
                <span className="font-bold text-white block">Payment Pending</span>
                <p>
                  Payment has not yet been confirmed by Paystack. Once paid, the order will progress to fulfillment.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
