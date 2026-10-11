import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Listing, Category, ListingType } from '../types.ts';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ListingCard } from '../components/ListingCard.tsx';
import { Search, X, RotateCcw } from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = searchParams.get('q') || '';
  const selectedType = (searchParams.get('type') || 'all') as 'all' | ListingType;
  const selectedCategory = searchParams.get('category') || 'all';
  const sortBy = searchParams.get('sort') || 'newest';

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getPublicListings(), api.getCategories()])
      .then(([allListings, allCats]) => {
        setListings(allListings);
        setCategories(allCats);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load marketplace listings.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const filteredListings = useMemo(() => {
    return listings
      .filter((listing) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = listing.name.toLowerCase().includes(q);
          const matchDesc = listing.description.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        if (selectedType !== 'all' && listing.type !== selectedType) {
          return false;
        }

        if (selectedCategory !== 'all' && listing.category_id !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price_ngn - b.price_ngn;
        if (sortBy === 'price_desc') return b.price_ngn - a.price_ngn;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [listings, searchQuery, selectedType, selectedCategory, sortBy]);

  const hasActiveFilters = searchQuery !== '' || selectedType !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest';

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2 font-medium">
            <span>Theeya's Deluxe Hub</span>
            <span aria-hidden="true" className="text-[#6B7280]">/</span>
            <span className="text-[#FACC15] font-semibold">Marketplace Catalogue</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            WhatsApp Groups & Channels
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-2xl">
            Browse WhatsApp Groups and Channels with verified prices in NGN and clear order fulfillment.
          </p>
        </div>

        {/* Filter & Control Bar */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-4 mb-8 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search WhatsApp Groups and Channels by name, topic, or keywords..."
                value={searchQuery}
                onChange={(e) => updateParam('q', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white placeholder:text-[#6B7280] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => updateParam('q', '')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E2638] rounded-xl shrink-0">
              <button
                onClick={() => updateParam('type', 'all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-[#161C2C] text-[#FACC15] shadow-sm border border-[#FACC15]/30'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => updateParam('type', 'group')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'group'
                    ? 'bg-[#161C2C] text-[#FACC15] shadow-sm border border-[#FACC15]/30'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Groups
              </button>
              <button
                onClick={() => updateParam('type', 'channel')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedType === 'channel'
                    ? 'bg-[#161C2C] text-[#FACC15] shadow-sm border border-[#FACC15]/30'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Channels
              </button>
            </div>
          </div>

          {/* Secondary Controls: Category & Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#1F2637] text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#9CA3AF] font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => updateParam('category', e.target.value)}
                className="bg-[#0B0F17] border border-[#1E2638] text-white rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-[#FACC15]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <span className="text-[#9CA3AF] font-medium ml-2">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-[#0B0F17] border border-[#1E2638] text-white rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-[#FACC15]"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[#9CA3AF] font-mono tabular-nums">
                {filteredListings.length} {filteredListings.length === 1 ? 'WhatsApp listing' : 'WhatsApp listings'}
              </span>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[#FACC15] hover:text-[#EAB308] font-bold underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Region */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-[#111622] border border-[#1F2637] animate-pulse p-4" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-[#111622] border border-red-900 rounded-2xl p-8 text-center max-w-md mx-auto">
            <p className="text-sm text-red-400 font-medium mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center max-w-lg mx-auto space-y-4">
            <h3 className="font-display font-bold text-lg text-white">No Matching Communities Found</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              No WhatsApp Groups or Channels matched your filter criteria. Try resetting search filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const cat = categories.find((c) => c.id === listing.category_id);
              return <ListingCard key={listing.id} listing={listing} categoryName={cat?.name} />;
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
