import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { MessageSquare, ArrowLeft, ShieldCheck, Clock, Copy, Check } from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<{ access_url: string; fulfilled_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    api
      .getOrder(orderId)
      .then((res) => {
        setOrder(res.order);
        setFulfillment(res.fulfillment);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="mb-8">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308] mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Marketplace</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                Order Details
              </h1>
              <span className="text-xs text-[#9CA3AF] font-mono mt-1 block">
                {order ? order.order_number : orderId}
              </span>
            </div>
            {order && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                order.order_status === 'completed'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}>
                {order.order_status.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center animate-pulse">
            <p className="text-xs text-[#9CA3AF]">Loading order information...</p>
          </div>
        ) : !order ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center">
            <h2 className="font-bold text-base text-white mb-2">Order Not Found</h2>
            <p className="text-xs text-[#9CA3AF] mb-4">We could not retrieve details for this order ID.</p>
            <Link to="/marketplace" className="text-xs font-bold text-[#FACC15] underline">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fulfillment Card */}
            {fulfillment && order.order_status === 'completed' ? (
              <div className="bg-[#111622] rounded-2xl border border-[#FACC15]/40 p-6 sm:p-8 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Verified WhatsApp Invitation Link</span>
                </div>
                <h3 className="font-display font-bold text-lg text-white">
                  WhatsApp Invitation Ready for {order.listing_snapshot.name}
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Your purchase is confirmed and your WhatsApp Group or Channel invitation link is ready. Click below to join.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={fulfillment.access_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-sm rounded-xl shadow-md inline-flex items-center gap-2 transition-transform hover:scale-[1.02]"
                  >
                    <MessageSquare className="w-4 h-4 text-black" />
                    <span>Join Your WhatsApp Group or Channel</span>
                  </a>

                  <button
                    onClick={() => copyLink(fulfillment.access_url)}
                    className="px-4 py-3 bg-[#0B0F17] hover:bg-[#161C2C] border border-[#1E2638] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            ) : order.payment_status === 'paid' ? (
              <div className="bg-[#111622] rounded-2xl border border-amber-800 p-6 text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Clock className="w-4 h-4 text-[#FACC15]" />
                  <span>Payment Verified — Preparing Your WhatsApp Invitation Link</span>
                </div>
                <p className="text-[#9CA3AF]">
                  Your payment has been confirmed. Our team is finalizing your private invitation link. Once verified, it will appear here and in your inbox.
                </p>
              </div>
            ) : (
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 text-xs text-[#9CA3AF] space-y-1">
                <span className="font-bold text-white block">Awaiting Payment Confirmation</span>
                <p>Payment has not yet settled. Once confirmed by Paystack, your order will proceed to fulfillment.</p>
              </div>
            )}

            {/* Order Specification Summary */}
            <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 space-y-4 shadow-xl">
              <h3 className="font-display font-semibold text-xs tracking-wider uppercase text-[#9CA3AF]">
                Item Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#6B7280] block">Community Name</span>
                  <span className="font-bold text-white mt-0.5 block">{order.listing_snapshot.name}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Type</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {order.listing_snapshot.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Amount</span>
                  <span className="font-bold text-[#FACC15] font-mono tabular-nums mt-0.5 block">
                    ₦{(order.amount_kobo / 100).toLocaleString('en-NG')}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Payment Gateway</span>
                  <span className="font-semibold text-white mt-0.5 block">Paystack</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
