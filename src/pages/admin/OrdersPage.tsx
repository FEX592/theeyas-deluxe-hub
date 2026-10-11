import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Order } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Search, ArrowRight } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    api
      .getAdminOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'awaiting_fulfillment') {
        if (!(o.payment_status === 'paid' && o.order_status !== 'completed')) return false;
      } else if (o.order_status !== statusFilter) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      const matchNum = o.order_number.toLowerCase().includes(q);
      const matchName = o.customer_name.toLowerCase().includes(q);
      const matchEmail = o.customer_email.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchEmail) return false;
    }
    return true;
  });

  return (
    <AdminLayout
      title="Orders Queue"
      subtitle="Track customer purchases, verify payments, and send WhatsApp Group or Channel invitation links"
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order #, customer name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#FACC15]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl font-medium text-white focus:outline-none focus:border-[#FACC15]"
            >
              <option value="all">All Orders</option>
              <option value="awaiting_fulfillment">Paid · Awaiting Fulfillment</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F3F4F6]">
              <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Community Listing</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2637]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                      Loading orders...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                      No orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const isAwaitingFulfillment =
                      order.payment_status === 'paid' && order.order_status !== 'completed';

                    return (
                      <tr key={order.id} className="hover:bg-[#161C2C]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {order.order_number}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold block text-white">{order.customer_name}</span>
                          <span className="text-[11px] text-[#9CA3AF] block font-mono">{order.customer_email}</span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-[#9CA3AF]">
                          {order.listing_snapshot.name}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#FACC15] tabular-nums">
                          ₦{(order.amount_kobo / 100).toLocaleString('en-NG')}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              order.payment_status === 'paid'
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : 'bg-amber-950/60 border-amber-800 text-amber-300'
                            }`}
                          >
                            {order.payment_status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              order.order_status === 'completed'
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : isAwaitingFulfillment
                                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                : 'bg-gray-800 border-gray-700 text-gray-300'
                            }`}
                          >
                            {isAwaitingFulfillment ? 'AWAITING LINK' : order.order_status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#6B7280] font-mono text-[11px]">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="px-3 py-1.5 text-xs font-semibold text-[#FACC15] hover:bg-[#161C2C] border border-[#1E2638] rounded-xl inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
