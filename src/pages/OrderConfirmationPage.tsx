import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Order } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Mail, MessageSquare, Loader2 } from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');

  const [order, setOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<{ access_url: string; fulfilled_at: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const checkOrder = async () => {
      try {
        setLoading(true);
        if (reference) {
          setVerifying(true);
          try {
            await api.verifyPayment(reference);
          } catch (e) {
            console.warn('Payment verify notice:', e);
          } finally {
            setVerifying(false);
          }
        }

        const res = await api.getOrder(orderId);
        setOrder(res.order);
        setFulfillment(res.fulfillment);
      } catch (err: any) {
        setError(err.message || 'Unable to retrieve order confirmation');
      } finally {
        setLoading(false);
      }
    };

    checkOrder();
  }, [orderId, reference]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {loading || verifying ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center shadow-xl">
            <Loader2 className="w-10 h-10 animate-spin text-[#FACC15] mx-auto mb-4" />
            <h2 className="font-display font-bold text-lg text-white">
              {verifying ? 'Verifying payment with Paystack...' : 'Retrieving order confirmation...'}
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1">Please wait while we confirm your transaction state.</p>
          </div>
        ) : error || !order ? (
          <div className="bg-[#111622] rounded-2xl border border-red-800 p-8 text-center shadow-xl">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h2 className="font-display font-bold text-lg text-white">Order Lookup Failed</h2>
            <p className="text-xs text-[#9CA3AF] mt-1 mb-6">{error || 'Order could not be found.'}</p>
            <Link
              to="/marketplace"
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-10 shadow-xl space-y-8">
            {/* Status Header */}
            <div className="text-center pb-6 border-b border-[#1F2637]">
              {order.payment_status === 'paid' ? (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-950/60 border border-amber-800 text-[#FACC15] mb-3">
                  <Clock className="w-8 h-8" />
                </div>
              )}

              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                {order.payment_status === 'paid'
                  ? order.order_status === 'completed'
                    ? 'Payment Confirmed — WhatsApp Link Ready'
                    : 'Payment Verified — Awaiting Fulfillment'
                  : 'Order Created — Payment Awaiting Confirmation'}
              </h1>

              <p className="text-xs text-[#9CA3AF] mt-2 font-mono">
                Order ID: <span className="font-bold text-[#FACC15]">{order.order_number}</span>
              </p>
            </div>

            {/* If Access is already ready (automatic mode) */}
            {fulfillment && order.order_status === 'completed' && (
              <div className="p-6 rounded-2xl bg-[#0B0F17] border border-[#FACC15]/40 text-center space-y-3">
                <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block">
                  Your WhatsApp Group or Channel Invitation Link
                </span>
                <p className="text-xs text-[#9CA3AF]">
                  Your purchase of <strong className="text-white">{order.listing_snapshot.name}</strong> is confirmed. Use the link below to join your WhatsApp Group or Channel.
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
                  We have also dispatched an invitation copy to <strong className="text-[#9CA3AF]">{order.customer_email}</strong>.
                </p>
              </div>
            )}

            {/* Order Details Grid */}
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-sm text-white uppercase tracking-wide">
                Purchase Summary
              </h3>

              <div className="bg-[#0B0F17] rounded-xl border border-[#1E2638] p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Community Listing:</span>
                  <span className="font-semibold text-white text-right">
                    {order.listing_snapshot.name} (WhatsApp {order.listing_snapshot.type === 'group' ? 'Group' : 'Channel'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Amount Paid:</span>
                  <span className="font-bold text-[#FACC15] font-mono tabular-nums">
                    ₦{(order.amount_kobo / 100).toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Payment Status:</span>
                  <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {order.payment_status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Fulfillment Stage:</span>
                  <span className="font-semibold text-white">
                    {order.order_status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Customer Email:</span>
                  <span className="font-mono text-white">{order.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">WhatsApp Phone:</span>
                  <span className="font-mono text-white">{order.whatsapp_number}</span>
                </div>
              </div>
            </div>

            {/* Email Instructions Box */}
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] text-xs text-[#9CA3AF] flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Transactional Email Notice</span>
                <p className="mt-0.5 leading-relaxed text-[#9CA3AF]">
                  Transactional order confirmation and payment receipts are sent via Brevo to <strong className="text-white">{order.customer_email}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1F2637]">
              <Link
                to={`/track-order?orderId=${order.order_number}`}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#0B0F17] hover:bg-[#161C2C] border border-[#1E2638] rounded-xl text-center transition-colors"
              >
                Track Live Fulfillment Status
              </Link>

              <Link
                to="/marketplace"
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl text-center inline-flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <span>Browse More Communities</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
