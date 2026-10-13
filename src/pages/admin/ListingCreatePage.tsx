import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { Category, ListingType, FulfillmentMode } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { ListingMediaGalleryEditor } from '../../components/ListingMediaGalleryEditor.tsx';
import { ListingMediaItem } from '../../lib/listing-media.ts';
import { ArrowLeft, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export const ListingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  // Wizard Mode
  const [importMode, setImportMode] = useState<'wizard' | 'manual'>('wizard');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ListingType>('group');
  const [categoryId, setCategoryId] = useState('');
  const [priceNgn, setPriceNgn] = useState('15000');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<ListingMediaItem[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [availability, setAvailability] = useState<'available' | 'paused'>('available');
  const [featured, setFeatured] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('automatic');

  // Private Links (Restricted)
  const [internalSourceUrl, setInternalSourceUrl] = useState('');
  const [customerAccessUrl, setCustomerAccessUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  const handleSmartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappUrl.trim()) return;

    setImporting(true);
    setError(null);
    try {
      const res = await api.smartImport(whatsappUrl.trim());
      setImportFeedback(res);
      setType(res.type);
      setInternalSourceUrl(res.source_url);
      setCustomerAccessUrl(res.source_url);
      const slugCandidate = res.source_url.split('/').pop() || '';
      setName(slugCandidate.replace(/[-_]/g, ' '));
      setSlug(slugCandidate.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      setImportMode('manual');
    } catch (err: any) {
      setError(err.message || 'Failed to inspect WhatsApp URL');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUploading || galleryUploading) return;
    if (!name.trim()) {
      setError('Listing title is required.');
      return;
    }

    if (fulfillmentMode === 'automatic' && !customerAccessUrl.trim()) {
      setError('Automatic delivery requires a valid WhatsApp Group or Channel invitation link.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.saveListing({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        type,
        category_id: categoryId,
        price_ngn: Number(priceNgn) || 10000,
        image_url:
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=1200&q=80',
        status,
        availability,
        featured,
        fulfillment_mode: fulfillmentMode,
        internal_source_url: internalSourceUrl.trim(),
        customer_access_url: customerAccessUrl.trim(),
        gallery_media: galleryMedia,
      });

      navigate('/admin/listings');
    } catch (err: any) {
      setError(err.message || 'Failed to save listing');
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Create WhatsApp Group or Channel Listing"
      subtitle="Add a new WhatsApp Group or Channel to THEEYA'S DELUXE HUB"
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

        {/* Wizard Choice: Smart Import vs Manual Entry */}
        {importMode === 'wizard' ? (
          <div className="space-y-6">
            <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                <Sparkles className="w-4 h-4 text-[#FACC15]" />
                <span>Smart WhatsApp Link Import</span>
              </div>
              <h2 className="font-display font-bold text-xl text-white mb-1">
                Import from WhatsApp Invitation Link
              </h2>
              <p className="text-xs text-[#9CA3AF] mb-6">
                Paste the WhatsApp Group or Channel URL. TDH will identify its type and prepare the invitation link fields.
              </p>

              <form onSubmit={handleSmartImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    WhatsApp Group or Channel URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://chat.whatsapp.com/... or https://whatsapp.com/channel/..."
                    value={whatsappUrl}
                    onChange={(e) => setWhatsappUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Supported formats: chat.whatsapp.com/ID or whatsapp.com/channel/ID
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-5 py-3 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Inspecting Link...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span>Inspect & Proceed</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('manual')}
                    className="px-4 py-2.5 text-xs font-semibold text-[#9CA3AF] hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Skip & Enter Manually
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Manual Listing Editor Form */
          <form onSubmit={handleSave} className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl space-y-6">
            {importFeedback && (
              <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] text-xs text-[#F3F4F6] space-y-1">
                <span className="font-bold text-[#FACC15] block">Smart Import Inspection Complete</span>
                <p className="text-[#9CA3AF]">{importFeedback.notes}</p>
                <div className="text-[11px] text-[#D6B36A] pt-1 font-mono">
                  Identified Type: {importFeedback.type.toUpperCase()} · Private link attached.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  WhatsApp Group or Channel Name <span className="text-[#FACC15]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lagos Angel Syndicate Network"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  URL Slug (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  placeholder="e.g. lagos-angel-syndicate"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  WhatsApp Listing Type <span className="text-[#FACC15]">*</span>
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

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  Cover Image (JPG, PNG, or WebP; max 5 MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageUploading}
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setError('Cover images must be 5 MB or smaller.'); return; }
                    setImageUploading(true);
                    setError(null);
                    try { setImageUrl((await api.uploadListingCover(file)).url); }
                    catch (err: any) { setError(err.message || 'Cover image upload failed.'); }
                    finally { setImageUploading(false); }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                />
                <p className="mt-1 text-[11px] text-[#9CA3AF]">{imageUploading ? 'Uploading image…' : imageUrl ? 'Cover image uploaded.' : 'Upload an image from your device.'}</p>
                {imageUrl && <img src={imageUrl} alt="Cover preview" className="mt-3 h-32 w-full max-w-xs rounded-lg border border-[#1E2638] object-contain" />}
              </div>

              <ListingMediaGalleryEditor media={galleryMedia} onChange={setGalleryMedia} onUploadingChange={setGalleryUploading} disabled={saving} />

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  ABOUT the WhatsApp Group or Channel <span className="text-[#FACC15]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe this group or channel, its audience, and what members can expect..."
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
                  <option value="automatic">Automatic (Delivers link immediately after payment)</option>
                  <option value="manual">Manual (Admin must approve and attach link)</option>
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
                  <option value="published">Published (Visible in marketplace)</option>
                  <option value="draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>

            {/* Private Link Section (Restricted) */}
            <div className="pt-6 border-t border-[#1F2637] space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-white">
                  WhatsApp Group or Channel Invitation Links
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  These URLs are stored strictly in private backend storage and are NEVER returned in public listing queries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Customer WhatsApp Invitation Link <span className="text-[#FACC15]">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://chat.whatsapp.com/G4YFoundersLink"
                    value={customerAccessUrl}
                    onChange={(e) => setCustomerAccessUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono text-xs"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Sent to customers after their WhatsApp Group or Channel purchase is confirmed.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Internal Source URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://chat.whatsapp.com/G4YFoundersLink"
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
              <button
                type="button"
                onClick={() => setImportMode('wizard')}
                className="text-xs font-semibold text-[#9CA3AF] hover:text-white"
              >
                ← Back to Import Wizard
              </button>

              <button
                type="submit"
                disabled={saving || imageUploading || galleryUploading}
                className="px-6 py-3 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {imageUploading ? 'Uploading Cover Image...' : galleryUploading ? 'Uploading Gallery Media...' : saving ? 'Saving Listing...' : 'Publish WhatsApp Listing'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};
