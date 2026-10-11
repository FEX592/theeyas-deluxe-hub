import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Order, OrderFulfillment, EmailLogEntry } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Mail,
} from 'lucide-react';

export const OrderDetailAdminPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Fulfillment State
  const [accessUrl, setAccessUrl] = useState('');
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [submittingFulfillment, setSubmittingFulfillment] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    api
      .getAdminOrder(id)
      .then((res) => {
        setOrder(res.order);
        setFulfillment(res.fulfillment || null);
        if (res.fulfillment) {
          setAccessUrl(res.fulfillment.access_url);
        }
        setTransactions(res.transactions || []);
        setEmailLogs(res.email_logs || []);
      })
      .catch((err) => {
        setFeedback({ type: 'error', message: err.message || 'Failed to load order' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !accessUrl.trim()) return;

    setSubmittingFulfillment(true);
    setFeedback(null);

    try {
      await api.fulfillOrder(id, accessUrl.trim(), fulfillmentNotes.trim());
      setFeedback({
        type: 'success',
        message: 'WhatsApp Group or Channel invitation link delivered; customer email queued in Brevo.',
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to complete fulfillment' });
    } finally {
      setSubmittingFulfillment(false);
    }
  };

  const handleResendAccess = async () => {
    if (!id) return;
    setResendingEmail(true);
    setFeedback(null);

    try {
      await api.resendAccessEmail(id);
      setFeedback({
        type: 'success',
        message: 'WhatsApp invitation email queued to send again.',
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to dispatch email' });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <AdminLayout
      title={`Order Inspection: ${order?.order_number || id}`}
      subtitle="Verify purchase details and payments, and send private WhatsApp Group or Channel invitation links"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Orders Queue</span>
          </Link>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center text-xs text-[#9CA3AF] animate-pulse">
            Loading order details...
          </div>
        ) : !order ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center text-xs text-[#9CA3AF]">
            Order record not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns: Order and Fulfillment Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Order Overview Header Card */}
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
                  <div>
                    <span className="text-[11px] font-mono text-[#6B7280] uppercase">Order Reference</span>
                    <h2 className="font-display font-extrabold text-xl text-white">{order.order_number}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        order.payment_status === 'paid'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/60 text-amber-300 border-amber-800'
                      }`}
                    >
                      Payment: {order.payment_status.toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        order.order_status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : 'bg-[#161C2C] text-[#FACC15] border-[#1F2637]'
                      }`}
                    >
                      Status: {order.order_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-[#9CA3AF]">
                  <div>
                    <span className="block text-[#6B7280]">Customer Name:</span>
                    <span className="font-semibold text-white mt-0.5 block">{order.customer_name}</span>
                  </div>
                  <div>
                    <span className="block text-[#6B7280]">Customer Email:</span>
                    <span className="font-mono text-white mt-0.5 block">{order.customer_email}</span>
                  </div>
                  <div>
                    <span className="block text-[#6B7280]">WhatsApp Contact:</span>
                    <span className="font-mono text-white mt-0.5 block">{order.whatsapp_number}</span>
                  </div>
                  <div>
                    <span className="block text-[#6B7280]">Created Timestamp:</span>
                    <span className="font-mono text-white mt-0.5 block">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Listing Card */}
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-3">
                <h3 className="font-display font-bold text-sm text-white">Purchased WhatsApp Listing</h3>
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block text-sm">{order.listing_snapshot.name}</span>
                    <span className="text-[#9CA3AF] mt-0.5 block">
                      {order.listing_snapshot.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'} · {order.listing_snapshot.category_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-base text-[#FACC15] font-mono tabular-nums">
                      ₦{(order.amount_kobo / 100).toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fulfillment Section */}
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#FACC15]" />
                    <span>WhatsApp Group or Channel Invitation Delivery</span>
                  </h3>
                  {fulfillment && (
                    <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                      Fulfilled on {new Date(fulfillment.fulfilled_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {order.payment_status !== 'paid' ? (
                  <div className="p-4 bg-amber-950/60 border border-amber-800 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Payment must be confirmed before fulfillment can be completed. Current payment status is pending.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleFulfill} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                        Private WhatsApp Group or Channel Invitation Link <span className="text-[#FACC15]">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://chat.whatsapp.com/... or https://whatsapp.com/channel/..."
                        value={accessUrl}
                        onChange={(e) => setAccessUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] font-mono text-white"
                      />
                      <span className="text-[11px] text-[#6B7280] mt-1 block">
                        This URL will be recorded in the order fulfillment snapshot and emailed to the customer.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                        Operational Fulfillment Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified by Admin, invited to Cohort 4"
                        value={fulfillmentNotes}
                        onChange={(e) => setFulfillmentNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={submittingFulfillment}
                        className="px-5 py-3 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
                      >
                        {submittingFulfillment
                          ? 'Committing Fulfillment...'
                          : fulfillment
                          ? 'Update Link & Mark Completed'
                          : 'Complete Fulfillment & Dispatch Email'}
                      </button>

                      {fulfillment && order.order_status === 'completed' && (
                        <button
                          type="button"
                          onClick={handleResendAccess}
                          disabled={resendingEmail}
                          className="px-4 py-3 text-xs font-semibold text-white bg-[#1F2637] hover:bg-[#283248] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#FACC15]" />
                          <span>{resendingEmail ? 'Sending...' : 'Resend WhatsApp Invitation Email'}</span>
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Transactions & Email Audit Logs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Payment Transactions Log */}
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-5 shadow-xl space-y-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  Payment Gateway Audit
                </h3>

                {transactions.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No gateway records logged yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="font-bold text-white">{tx.provider.toUpperCase()}</span>
                          <span className="text-emerald-400 font-semibold">{tx.status.toUpperCase()}</span>
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] font-mono truncate">Ref: {tx.reference}</div>
                        <div className="text-[10px] text-[#6B7280]">
                          Logged at {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Email Notification History */}
              <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-5 shadow-xl space-y-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  Transactional Email History
                </h3>

                {emailLogs.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No emails logged for this order yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {emailLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">{log.template_name}</span>
                          <span className="text-emerald-400 font-mono text-[11px]">{log.status}</span>
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] font-mono">To: {log.recipient}</div>
                        <div className="text-[10px] text-[#6B7280]">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
