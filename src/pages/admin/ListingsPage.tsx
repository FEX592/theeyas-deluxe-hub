import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Listing, Category } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Plus, Search, Edit3, Eye, Trash2 } from 'lucide-react';

export const ListingsPage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getAdminListings(), api.getCategories()])
      .then(([allListings, allCats]) => {
        setListings(allListings);
        setCategories(allCats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteListing(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing');
    }
  };

  const filtered = listings.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout
      title="WhatsApp Group & Channel Listings"
      subtitle="Manage WhatsApp Groups and Channels available in the marketplace"
      actions={
        <Link
          to="/admin/listings/new"
          className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>New WhatsApp Listing</span>
        </Link>
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-4 mb-6 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search listings by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#FACC15]"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl font-medium text-white focus:outline-none focus:border-[#FACC15]"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F3F4F6]">
            <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">WhatsApp Listing</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Fee (NGN)</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2637]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#6B7280]">
                    Loading listings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#6B7280]">
                    No listings match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <tr key={item.id} className="hover:bg-[#161C2C]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-[#0B0F17] shrink-0 border border-[#1E2638]"
                          />
                          <div>
                            <span className="font-bold text-xs text-white line-clamp-1 block">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-[#6B7280] font-mono">
                              /{item.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#9CA3AF]">
                        {item.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}
                      </td>

                      <td className="py-3.5 px-4 text-[#9CA3AF]">{cat?.name || 'General'}</td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#FACC15] tabular-nums">
                        ₦{item.price_ngn.toLocaleString('en-NG')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          item.fulfillment_mode === 'automatic'
                            ? 'bg-[#161C2C] border-[#1F2637] text-[#D6B36A]'
                            : 'bg-amber-950/60 border-amber-800 text-amber-300'
                        }`}>
                          {item.fulfillment_mode === 'automatic' ? 'Automatic' : 'Manual Review'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          item.status === 'published'
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                            : item.status === 'draft'
                            ? 'bg-gray-800 border-gray-700 text-gray-300'
                            : 'bg-red-950/60 border-red-800 text-red-300'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/listings/${item.id}/preview`}
                            className="p-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#161C2C] rounded"
                            title="Safe Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/admin/listings/${item.id}/edit`}
                            className="p-1.5 text-[#FACC15] hover:bg-[#161C2C] rounded font-semibold"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-red-400 hover:bg-red-950/50 rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
