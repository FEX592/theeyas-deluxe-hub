import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Listing, Category } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ListingCard } from '../components/ListingCard.tsx';
import { ArrowRight, ShieldCheck, MessageSquare, CheckCircle, Search } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPublicListings(), api.getCategories()])
      .then(([allListings, allCats]) => {
        setListings(allListings);
        setCategories(allCats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const featuredListings = listings.filter((l) => l.featured).slice(0, 3);
  const recentListings = listings.slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-[#1F2637]">
          {/* Subtle deep plum & gold ambient backlights */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#5B2A5F]/20 via-[#3D183F]/15 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Quiet Kicker (Zero-Pill Discipline) */}
              <div className="text-xs font-bold uppercase tracking-wider text-[#FACC15] mb-3 flex items-center gap-2">
                <span>Theeya's Deluxe Hub</span>
                <span aria-hidden="true" className="text-[#6B7280]">·</span>
                <span className="text-[#D6B36A]">Curated WhatsApp Communities</span>
              </div>

              {/* Exact Approved Heading */}
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1] text-balance">
                Find and Buy WhatsApp Groups & Channels
              </h1>

              {/* Exact Approved Supporting Text */}
              <p className="mt-6 text-base sm:text-lg text-[#9CA3AF] leading-relaxed max-w-2xl text-balance">
                Browse available WhatsApp Groups and Channels, explore their details and prices, and order access to the communities that interest you.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/marketplace"
                  className="px-6 py-3.5 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <span>Browse Groups & Channels</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </Link>

                <Link
                  to="/track-order"
                  className="px-5 py-3.5 text-sm font-semibold text-white bg-[#111622] border border-[#1F2637] hover:border-[#D6B36A] hover:bg-[#161C2C] rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <Search className="w-4 h-4 text-[#9CA3AF]" />
                  <span>Track Existing Order</span>
                </Link>
              </div>

              {/* Trust Markers */}
              <div className="mt-12 pt-8 border-t border-[#1F2637] flex flex-wrap items-center gap-6 text-xs text-[#9CA3AF]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Verified WhatsApp invite links</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  <span>Secure Paystack settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#FACC15]" />
                  <span>Automated & managed access delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Communities Section */}
        {featuredListings.length > 0 && (
          <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                  Curated Selection
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  Featured WhatsApp Communities
                </h2>
              </div>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FACC15] hover:text-[#EAB308]"
              >
                <span>View all listings</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredListings.map((listing) => {
                const cat = categories.find((c) => c.id === listing.category_id);
                return <ListingCard key={listing.id} listing={listing} categoryName={cat?.name} />;
              })}
            </div>
          </section>
        )}

        {/* Categories Grid */}
        <section className="py-16 bg-[#0D111A] border-y border-[#1F2637]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                Explore by Domain
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Marketplace Categories
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-2">
                Discover curated networks grouped by industry, investment corridor, and specialization.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => {
                const count = listings.filter((l) => l.category_id === cat.id).length;
                return (
                  <Link
                    key={cat.id}
                    to={`/marketplace?category=${cat.id}`}
                    className="p-4 bg-[#111622] rounded-2xl border border-[#1F2637] hover:border-[#D6B36A] hover:shadow-lg transition-all text-center flex flex-col items-center justify-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#161C2C] border border-[#1F2637] flex items-center justify-center text-[#FACC15] group-hover:scale-105 transition-transform mb-3">
                      <span className="font-display font-bold text-xs">{cat.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <h3 className="font-display font-semibold text-xs text-white group-hover:text-[#FACC15] transition-colors leading-tight">
                      {cat.name}
                    </h3>
                    <span className="text-[11px] text-[#6B7280] mt-1 font-mono">
                      {count} {count === 1 ? 'listing' : 'listings'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* All Recent Listings Grid */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                Latest Additions
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Available Groups & Channels
              </h2>
            </div>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FACC15] hover:text-[#EAB308]"
            >
              <span>Explore catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-[#111622] border border-[#1F2637] animate-pulse p-4" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentListings.map((listing) => {
                const cat = categories.find((c) => c.id === listing.category_id);
                return <ListingCard key={listing.id} listing={listing} categoryName={cat?.name} />;
              })}
            </div>
          )}
        </section>

        {/* Factual How It Works Section */}
        <section className="py-16 bg-[#0B0E17] border-t border-[#1F2637]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                Fulfillment Process
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                How Community Access Works
              </h2>
              <p className="text-sm text-[#9CA3AF] mt-2">
                Order placement, payment verification, and delivery are governed strictly by verifiable steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-[#111622] border border-[#1F2637]">
                <span className="font-display font-extrabold text-2xl text-[#FACC15] block mb-2 font-mono">01</span>
                <h3 className="font-display font-bold text-base text-white mb-1">Browse Listings</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Review vetted WhatsApp Groups and Channels with published fee tiers and description details.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111622] border border-[#1F2637]">
                <span className="font-display font-extrabold text-2xl text-[#FACC15] block mb-2 font-mono">02</span>
                <h3 className="font-display font-bold text-base text-white mb-1">Order Access</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Provide your customer name, email address, and WhatsApp contact to initiate the order.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111622] border border-[#1F2637]">
                <span className="font-display font-extrabold text-2xl text-[#FACC15] block mb-2 font-mono">03</span>
                <h3 className="font-display font-bold text-base text-white mb-1">Pay with Paystack</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Complete payment via Paystack cards, bank transfer, or USSD with server-authoritative confirmation.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111622] border border-[#1F2637]">
                <span className="font-display font-extrabold text-2xl text-[#FACC15] block mb-2 font-mono">04</span>
                <h3 className="font-display font-bold text-base text-white mb-1">Receive Access</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Upon verified fulfillment, your private invitation link is delivered to your email and order portal.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
