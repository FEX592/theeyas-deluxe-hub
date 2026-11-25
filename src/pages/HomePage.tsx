import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { api } from '../lib/api.ts';
import { Listing, Category } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ListingCard } from '../components/ListingCard.tsx';
import { ArrowRight, ShieldCheck, MessageSquare, CheckCircle, Search } from 'lucide-react';

// Reusable section entrance variant
const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const HomePage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll progress for top progress bar
  const { scrollYProgress } = useScroll();

  const scrollProgress = useTransform(scrollYProgress, [0, 1], [0, 100]);

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

  // Scroll-triggered section refs
  const featuredRef = React.useRef<HTMLDivElement>(null);
  const featuredInView = useInView(featuredRef, { once: true, margin: '-100px' });

  const categoriesRef = React.useRef<HTMLDivElement>(null);
  const categoriesInView = useInView(categoriesRef, { once: true, margin: '-100px' });

  const recentRef = React.useRef<HTMLDivElement>(null);
  const recentInView = useInView(recentRef, { once: true, margin: '-100px' });

  const processRef = React.useRef<HTMLDivElement>(null);
  const processInView = useInView(processRef, { once: true, margin: '-100px' });

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      {/* Scroll progress bar */}
      <motion.div
        style={{
          scaleX: scrollProgress,
          transformOrigin: '0%',
        }}
        className="fixed top-0 left-0 h-1 bg-[#FACC15] z-50"
      />

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-[#1F2637]">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#5B2A5F]/20 via-[#3D183F]/15 to-transparent blur-3xl pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FACC15] mb-3 flex items-center gap-2">
                <span>Theeya's Deluxe Hub</span>
                <span aria-hidden="true" className="text-[#6B7280]">·</span>
                <span className="text-[#D6B36A]">Curated WhatsApp Communities</span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.7, ease: 'easeOut' } }}
                className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1] text-balance"
              >
                Find and Buy WhatsApp Groups & Channels
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.7, ease: 'easeOut' } }}
                className="mt-6 text-base sm:text-lg text-[#9CA3AF] leading-relaxed max-w-2xl text-balance"
              >
                Browse WhatsApp Groups and Channels, compare their details and prices, and buy the ones that interest you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.7, ease: 'easeOut' } }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/marketplace"
                  className="px-6 py-3.5 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl shadow-lg transition-all inline-flex items-center gap-2 while-hover:scale-[1.02] while-tap:scale-[0.96]"
                >
                  <span>Browse WhatsApp Groups & Channels</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </Link>

                <Link
                  to="/track-order"
                  className="px-5 py-3.5 text-sm font-semibold text-white bg-[#111622] border border-[#1F2637] hover:border-[#D6B36A] hover:bg-[#161C2C] rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <Search className="w-4 h-4 text-[#9CA3AF]" />
                  <span>Track Existing Order</span>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.7, ease: 'easeOut' } }}
                className="mt-12 pt-8 border-t border-[#1F2637] flex flex-wrap items-center gap-6 text-xs text-[#9CA3AF]"
              >
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
                  <span>Purchase curated WhatsApp groups and channels</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Featured Communities Section */}
        {featuredListings.length > 0 && (
          <section
            ref={featuredRef}
            className={`
              py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
              ${featuredInView ? '' : 'opacity-0 translate-y-10'}
            `}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                  Curated Selection
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  Featured WhatsApp Groups & Channels
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
              {featuredListings.map((listing, idx) => {
                const cat = categories.find((c) => c.id === listing.category_id);
                return <ListingCard key={listing.id} listing={listing} categoryName={cat?.name} index={idx} />;
              })}
            </div>
          </section>
        )}

        {/* Categories Grid */}
        <section
          ref={categoriesRef}
          className={`
            py-16 bg-[#0D111A] border-y border-[#1F2637]
            ${categoriesInView ? '' : 'opacity-0 translate-y-10'}
          `}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                  Browse by Category
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  Find Your Community
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((cat) => {
                const count = listings.filter((l) => l.category_id === cat.id).length;
                return (
                  <motion.div
                    key={cat.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    asChild
                  >
                    <Link
                      to={`/marketplace?category=${cat.id}`}
                      className="p-4 bg-[#111622] rounded-2xl border border-[#1F2637] hover:border-[#D6B36A] hover:shadow-lg transition-all text-center flex flex-col items-center justify-center group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#161C2C] border border-[#1F2637] flex items-center justify-center text-[#FACC15] group-hover:scale-110 transition-transform mb-3">
                        <span className="font-display font-bold text-xs">{cat.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <h3 className="font-display font-semibold text-xs text-white group-hover:text-[#FACC15] transition-colors leading-tight">
                        {cat.name}
                      </h3>
                      <span className="text-[11px] text-[#6B7280] mt-1 font-mono">
                        {count} {count === 1 ? 'listing' : 'listings'}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* All Recent Listings Grid */}
        <section
          ref={recentRef}
          className={`
            py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
            ${recentInView ? '' : 'opacity-0 translate-y-10'}
          `}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                Latest Additions
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Available WhatsApp Groups & Channels
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
              {recentListings.map((listing, idx) => {
                const cat = categories.find((c) => c.id === listing.category_id);
                return <ListingCard key={listing.id} listing={listing} categoryName={cat?.name} index={idx + 3} />;
              })}
            </div>
          )}
        </section>

        {/* Factual How It Works Section */}
        <section
          ref={processRef}
          className={`
            py-16 bg-[#0B0E17] border-t border-[#1F2637]
            ${processInView ? '' : 'opacity-0 translate-y-10'}
          `}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-wider text-[#FACC15] font-bold block mb-1">
                Fulfillment Process
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                How Buying a WhatsApp Group or Channel Works
              </h2>
              <p className="text-sm text-[#9CA3AF] mt-2">
                Order placement, payment verification, and delivery are governed strictly by verifiable steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { n: '01', t: 'Browse Listings', d: 'Browse verified WhatsApp Groups and Channels, with clear descriptions and prices.' },
                { n: '02', t: 'Choose a Group or Channel', d: 'Choose the WhatsApp Group or Channel you want to buy, then enter your name, email, and WhatsApp number.' },
                { n: '03', t: 'Pay with Paystack', d: 'Complete payment via Paystack cards, bank transfer, or USSD with server-authoritative confirmation.' },
                { n: '04', t: 'Join Your WhatsApp Group or Channel', d: 'Once your purchase is confirmed, we email you an invitation to join the WhatsApp Group or Channel and show it on your order page.' },
              ].map((step, idx) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { delay: idx * 0.1, duration: 0.6, ease: 'easeOut' },
                  }}
                  className="p-6 rounded-2xl bg-[#111622] border border-[#1F2637]"
                >
                  <span className="font-display font-extrabold text-2xl text-[#FACC15] block mb-2 font-mono">{step.n}</span>
                  <h3 className="font-display font-bold text-base text-white mb-1">{step.t}</h3>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">{step.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
