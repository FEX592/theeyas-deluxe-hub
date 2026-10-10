import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Category, ListingType, FulfillmentMode } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { ArrowLeft, AlertCircle, Eye } from 'lucide-react';

export const ListingEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ListingType>('group');
  const [categoryId, setCategoryId] = useState('');
  const [priceNgn, setPriceNgn] = useState('15000');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [availability, setAvailability] = useState<'available' | 'sold_out' | 'paused'>('available');
  const [featured, setFeatured] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('automatic');

  const [internalSourceUrl, setInternalSourceUrl] = useState('');
  const [customerAccessUrl, setCustomerAccessUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getCategories(), api.getAdminListing(id)])
      .then(([cats, listing]) => {
        setCategories(cats);
        setName(listing.name);
        setSlug(listing.slug);
        setDescription(listing.description);
        setType(listing.type);
        setCategoryId(listing.category_id);
        setPriceNgn(String(listing.price_ngn));
        setImageUrl(listing.image_url);
        setStatus(listing.status);
        setAvailability(listing.availability);
        setFeatured(listing.featured);
        setFulfillmentMode(listing.fulfillment_mode);
        setInternalSourceUrl(listing.internal_source_url || '');
        setCustomerAccessUrl(listing.customer_access_url || '');
      })
      .catch((err) => setError(err.message || 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await api.saveListing({
        id,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        type,
        category_id: categoryId,
        price_ngn: Number(priceNgn) || 10000,
        image_url: imageUrl.trim(),
        status,
        availability,
        featured,
        fulfillment_mode: fulfillmentMode,
        internal_source_url: internalSourceUrl.trim(),
        customer_access_url: customerAccessUrl.trim(),
      });
      navigate('/admin/listings');
    } catch (err: any) {
      setError(err.message || 'Failed to update listing');
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Edit Community Listing"
      subtitle={`Modifying listing: ${name || id}`}
      actions={
        id && (
          <Link
            to={`/admin/listings/${id}/preview`}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#111622] border border-[#1F2637] hover:bg-[#161C2C] rounded-xl inline-flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>Preview Public View</span>
          </Link>
        )
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/admin/listings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Listings List</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center text-xs text-[#9CA3AF] animate-pulse">
            Loading listing editor...
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Community Name <span className="text-[#FACC15]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Community Type <span className="text-[#FACC15]">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ListingType)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                >
                  <option value="group">WhatsApp Group (Interactive)</option>
                  <option value="channel">WhatsApp Channel (Broadcast)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Category <span className="text-[#FACC15]">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Price in NGN <span className="text-[#FACC15]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  value={priceNgn}
                  onChange={(e) => setPriceNgn(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-[#FACC15] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                >
                  <option value="available">Available</option>
                  <option value="sold_out">Sold Out</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Description & Community Standards <span className="text-[#FACC15]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Fulfillment Mode <span className="text-[#FACC15]">*</span>
                </label>
                <select
                  value={fulfillmentMode}
                  onChange={(e) => setFulfillmentMode(e.target.value as FulfillmentMode)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                >
                  <option value="automatic">Automatic (Immediate delivery)</option>
                  <option value="manual">Manual (Admin must approve)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Private Link Section (Restricted) */}
            <div className="pt-6 border-t border-[#1F2637] space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-white">
                  Private Community Invitation Links
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  These URLs are stored strictly in private backend storage and are NEVER returned in public listing queries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Customer Access Invitation URL <span className="text-[#FACC15]">*</span>
                  </label>
                  <input
                    type="url"
                    value={customerAccessUrl}
                    onChange={(e) => setCustomerAccessUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono text-xs"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Sent to verified paying customers upon order completion.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Internal Source URL
                  </label>
                  <input
                    type="url"
                    value={internalSourceUrl}
                    onChange={(e) => setInternalSourceUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono text-xs"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Internal administration reference.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#1F2637]">
              <Link
                to="/admin/listings"
                className="text-xs font-semibold text-[#9CA3AF] hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Updating Listing...' : 'Save Listing Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};
