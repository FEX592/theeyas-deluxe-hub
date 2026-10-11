import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Listing, Order, EmailOutboxJob } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import {
  Layers,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Mail,
  CreditCard,
  ArrowRight,
  Plus,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [outbox, setOutbox] = useState<EmailOutboxJob[]>([]);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.getAdminListings(),
      api.getAdminOrders(),
      api.getEmailOutbox(),
      api.getHealth(),
    ])
      .then(([allListings, allOrders, allOutbox, healthData]) => {
        setListings(allListings);
        setOrders(allOrders);
        setOutbox(allOutbox);
        setHealth(healthData);
      })
      .catch(console.error);
  }, []);

  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const draftCount = listings.filter((l) => l.status === 'draft').length;
  const paidUnfulfilled = orders.filter((o) => o.payment_status === 'paid' && o.order_status !== 'completed').length;
  const completedOrders = orders.filter((o) => o.order_status === 'completed').length;
  const pendingEmails = outbox.filter((j) => j.status === 'queued' || j.status === 'retrying').length;
  const failedEmails = outbox.filter((j) => j.status === 'failed').length;

  return (
    <AdminLayout
      title="Operational Overview"
      subtitle="Summary of marketplace catalogue, real-time payment queues, and Brevo email automation"
      actions={
        <Link
          to="/admin/listings/new"
          className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>New WhatsApp Group or Channel Listing</span>
        </Link>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#111622] p-5 rounded-2xl border border-[#1F2637] shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-medium mb-2">
            <span>Catalogue Listings</span>
            <Layers className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-white font-mono tabular-nums">
              {publishedCount}
            </span>
            <span className="text-xs text-[#6B7280]">published ({draftCount} drafts)</span>
          </div>
          <Link to="/admin/listings" className="text-xs text-[#FACC15] font-semibold mt-3 inline-block hover:underline">
            Manage listings →
          </Link>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-[#1F2637] shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-medium mb-2">
            <span>Paid Awaiting Fulfillment</span>
            <Clock className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-display font-extrabold text-2xl font-mono tabular-nums ${paidUnfulfilled > 0 ? 'text-[#FACC15]' : 'text-white'}`}>
              {paidUnfulfilled}
            </span>
            <span className="text-xs text-[#6B7280]">require link delivery</span>
          </div>
          <Link to="/admin/orders" className="text-xs text-[#FACC15] font-semibold mt-3 inline-block hover:underline">
            View orders queue →
          </Link>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-[#1F2637] shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-medium mb-2">
            <span>Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-[#10B981] font-mono tabular-nums">
              {completedOrders}
            </span>
            <span className="text-xs text-[#6B7280]">WhatsApp invitation links sent</span>
          </div>
          <Link to="/admin/orders" className="text-xs text-[#FACC15] font-semibold mt-3 inline-block hover:underline">
            Inspect all orders →
          </Link>
        </div>

        <div className="bg-[#111622] p-5 rounded-2xl border border-[#1F2637] shadow-xl">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-medium mb-2">
            <span>Brevo Email Queue</span>
            <Mail className="w-4 h-4 text-[#FACC15]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-white font-mono tabular-nums">
              {pendingEmails}
            </span>
            <span className="text-xs text-[#6B7280]">in outbox ({failedEmails} failed)</span>
          </div>
          <Link to="/admin/emails" className="text-xs text-[#FACC15] font-semibold mt-3 inline-block hover:underline">
            Outbox operations →
          </Link>
        </div>
      </div>

      {/* Attention Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Paid Orders Requiring Fulfillment */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FACC15]" />
              <span>Paid Orders Awaiting Action</span>
            </h2>
            <Link to="/admin/orders" className="text-xs text-[#FACC15] hover:underline font-semibold">
              View All
            </Link>
          </div>

          {orders.filter((o) => o.payment_status === 'paid' && o.order_status !== 'completed').length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9CA3AF]">
              <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto mb-2" />
              <span>All paid orders have been successfully fulfilled and invitation links delivered.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#1F2637]">
              {orders
                .filter((o) => o.payment_status === 'paid' && o.order_status !== 'completed')
                .map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{order.order_number}</span>
                        <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800 font-semibold px-2 py-0.5 rounded">
                          Paid · Awaiting Link
                        </span>
                      </div>
                      <span className="text-xs text-[#9CA3AF] block mt-0.5">
                        {order.customer_name} ({order.customer_email}) · {order.listing_snapshot.name}
                      </span>
                    </div>

                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="px-3 py-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg shrink-0 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Fulfill</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Integration Health & Environment */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F2637]">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FACC15]" />
              <span>System & Gateway Health</span>
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Paystack Payment Adapter</span>
                <span className="text-[#9CA3AF]">Server-side initialize, verify & HMAC-SHA512 webhook</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold text-[11px]">
                Installed (Active)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Brevo Transactional Email</span>
                <span className="text-[#9CA3AF]">Transactional API v3 with durable outbox queue</span>
              </div>
              <span className={`px-2.5 py-1 rounded font-bold text-[11px] ${health?.brevo_configured ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-amber-950/60 border border-amber-800 text-amber-300'}`}>
                {health?.brevo_configured ? 'Key Configured' : 'Outbox Queue Mode'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">HTML Source-Only Template Engine</span>
                <span className="text-[#9CA3AF]">Strict HTML body editing, sandbox preview & variable checks</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#161C2C] border border-[#1F2637] text-[#FACC15] font-bold text-[11px]">
                Active (5 Starter Templates)
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <Link to="/admin/payments" className="text-[#FACC15] font-semibold hover:underline">
              Configure Paystack →
            </Link>
            <Link to="/admin/emails/templates" className="text-[#FACC15] font-semibold hover:underline">
              Edit HTML Templates →
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
