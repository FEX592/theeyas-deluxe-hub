import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Listing, Category } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { ArrowLeft, Edit3, ExternalLink } from 'lucide-react';

export const ListingPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getAdminListing(id), api.getCategories()])
      .then(([l, cats]) => {
        setListing(l);
        const c = cats.find((item) => item.id === l.category_id);
        if (c) setCategory(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminLayout
      title="Listing Safe Preview"
      subtitle="Preview how this WhatsApp Group or Channel listing appears in the marketplace"
      actions={
        id && (
          <Link
            to={`/admin/listings/${id}/edit`}
            className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl inline-flex items-center gap-1.5 transition-all shadow-md"
          >
            <Edit3 className="w-3.5 h-3.5 text-black" />
            <span>Edit Listing</span>
          </Link>
        )
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/listings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Listings Table</span>
          </Link>

          {listing?.status === 'published' && (
            <Link
              to={`/marketplace/${listing.slug}`}
              target="_blank"
              className="text-xs text-[#FACC15] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Open Live Public URL</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center animate-pulse text-xs text-[#9CA3AF]">
            Loading listing preview...
          </div>
        ) : !listing ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center text-xs text-[#9CA3AF]">
            Listing not found.
          </div>
        ) : (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 space-y-6">
                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E2638]">
                  <img
                    src={listing.image_url}
                    alt={listing.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white mb-2">ABOUT</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed whitespace-pre-line">
                    {listing.description}
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#0B0F17] rounded-xl border border-[#1E2638] p-6 space-y-4">
                <div className="text-xs text-[#9CA3AF] font-medium">
                  <span>{listing.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}</span> · <span>{category?.name || 'General'}</span>
                </div>
                <h2 className="font-display font-bold text-xl text-white">{listing.name}</h2>
                <div className="p-4 bg-[#111622] rounded-xl border border-[#1F2637] flex justify-between items-baseline">
                  <span className="text-xs text-[#9CA3AF]">WhatsApp Group/Channel Price:</span>
                  <span className="font-display font-bold text-xl text-[#FACC15] font-mono tabular-nums">
                    ₦{listing.price_ngn.toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF] space-y-1">
                  <span className="font-semibold text-white block">Fulfillment mode:</span>
                  <span className="capitalize">{listing.fulfillment_mode} delivery</span>
                </div>
                <button
                  disabled
                  className="w-full py-3 bg-[#1F2637] text-[#9CA3AF] font-bold text-xs rounded-xl cursor-not-allowed"
                >
                  Buy This WhatsApp {listing.type === 'group' ? 'Group' : 'Channel'} (Admin Preview)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
