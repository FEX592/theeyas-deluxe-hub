import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Listing, Category } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ListingMediaGallery } from '../components/ListingMediaGallery.tsx';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const ListingDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getListing(slug)
      .then(async (l) => {
        setListing(l);
        if (l.category_id) {
          const cats = await api.getCategories();
          const found = cats.find((c) => c.id === l.category_id);
          if (found) setCategory(found);
        }
      })
      .catch((err) => {
        setError(err.message || 'Listing not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-16 w-full animate-pulse space-y-6">
          <div className="h-6 w-36 bg-[#161C2C] rounded-lg" />
          <div className="h-96 bg-[#111622] rounded-2xl border border-[#1F2637]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
        <Header />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
            <h2 className="font-display font-bold text-2xl text-white mb-3">WhatsApp Group or Channel Not Found</h2>
            <p className="text-sm text-[#9CA3AF] mb-6">
              The requested WhatsApp Group or Channel listing does not exist, has been archived, or is currently unpublished.
            </p>
            <Link
              to="/marketplace"
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl inline-flex items-center gap-2 transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              <span>Return to Marketplace</span>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
        {/* Breadcrumb Navigation */}
        <div className="mb-8">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308] transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <span>Marketplace</span>
            <span aria-hidden="true" className="text-[#6B7280]">/</span>
            <span>{category?.name || 'WhatsApp Group or Channel'}</span>
            <span aria-hidden="true" className="text-[#6B7280]">/</span>
            <span className="text-white font-semibold truncate max-w-xs">{listing.name}</span>
          </div>
        </div>

        {/* 2-Column Contiguous Purchase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Visual Media & Full Details */}
          <div className="lg:col-span-7 space-y-8">
            <ListingMediaGallery coverUrl={listing.image_url} title={listing.name} media={listing.gallery_media || []} />

            {/* Description Section */}
            <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="font-display font-bold text-lg text-white mb-3">ABOUT</h2>
                <div className="text-sm text-[#9CA3AF] leading-relaxed whitespace-pre-line space-y-4">
                  {listing.description}
                </div>
              </div>

              {/* Verified Features */}
              <div className="pt-6 border-t border-[#1F2637] space-y-3">
                <h3 className="font-display font-semibold text-xs tracking-wider uppercase text-[#FACC15]">
                  WhatsApp Listing & Purchase Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#9CA3AF]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Verified WhatsApp Group or Channel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Verified administrator link target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Secure Paystack server settlement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Order-bound invitation receipt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module (Sticky on Desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 md:p-8 shadow-xl space-y-6">
              {/* Type & Category Header */}
              <div>
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2 font-medium">
                  <span>{listing.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}</span>
                  <span aria-hidden="true" className="text-[#6B7280]">·</span>
                  <span>{category?.name || 'General'}</span>
                </div>

                <h1 className="font-display font-extrabold text-2xl text-white leading-snug">
                  {listing.name}
                </h1>
              </div>

              {/* Price Block */}
              <div className="p-4 bg-[#0B0F17] rounded-xl border border-[#1E2638] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] block font-medium">
                    WhatsApp Group/Channel Price
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#FACC15] font-mono tabular-nums">
                      ₦{listing.price_ngn.toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>One-time Purchase</span>
                </div>
              </div>

              {/* Fulfillment Mode Callout */}
              <div className="p-4 rounded-xl border border-[#1E2638] bg-[#0B0F17] space-y-2 text-xs text-[#9CA3AF]">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Zap className="w-4 h-4 text-[#FACC15]" />
                  <span>
                    {listing.fulfillment_mode === 'automatic'
                      ? 'Instant Invitation Link Delivery'
                      : 'Invitation Link Sent After Review'}
                  </span>
                </div>
                <p className="leading-relaxed">
                  {listing.fulfillment_mode === 'automatic'
                    ? 'After Paystack confirms your purchase of this WhatsApp Group or Channel, we email you an invitation to join.'
                    : 'After Paystack confirms your purchase of this WhatsApp Group or Channel, our team reviews your order and emails you an invitation to join.'}
                </p>
              </div>

              {/* Primary Buy CTA */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => navigate(`/checkout/${listing.id}`)}
                  className="w-full py-4 px-6 bg-[#FACC15] hover:bg-[#EAB308] text-black font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Buy This WhatsApp {listing.type === 'group' ? 'Group' : 'Channel'}</span>
                  <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-[#9CA3AF]">
                  <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Encrypted 256-bit checkout via Paystack</span>
                </div>
              </div>
            </div>

            {/* Support Information Box */}
            <div className="p-4 rounded-2xl bg-[#111622] border border-[#1F2637] text-xs text-[#9CA3AF] space-y-1 text-center shadow-xl">
              <span className="font-semibold text-white block">Questions before purchasing?</span>
              <p>Email our support team at <a href="mailto:support@theeyasdeluxehub.com" className="text-[#FACC15] underline font-medium">support@theeyasdeluxehub.com</a></p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
