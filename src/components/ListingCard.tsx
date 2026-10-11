import React from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../types.ts';
import { ArrowRight, MessageSquare, Radio } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  categoryName?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, categoryName }) => {
  return (
    <div className="group flex flex-col bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden hover:border-[#D6B36A] hover:shadow-2xl transition-all duration-200">
      {/* Listing Media Thumbnail */}
      <div className="relative aspect-[16/10] w-full bg-[#0B0F17] overflow-hidden">
        <img
          src={listing.image_url}
          alt={listing.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.classList.add('flex', 'items-center', 'justify-center', 'bg-[#161C2C]');
              const fallback = document.createElement('div');
              fallback.className = 'text-center p-4 text-[#D6B36A]';
              fallback.innerHTML = `<span class="font-bold text-xs uppercase tracking-wider block">TDH Verified</span><span class="text-xs text-[#9CA3AF]">${listing.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}</span>`;
              parent.appendChild(fallback);
            }
          }}
        />
        {/* Subtle delivery mode indicator */}
        <div className="absolute bottom-2.5 left-2.5 bg-[#0B0F17]/90 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#1F2637] flex items-center gap-1.5">
          {listing.type === 'group' ? (
            <MessageSquare className="w-3 h-3 text-[#FACC15]" />
          ) : (
            <Radio className="w-3 h-3 text-[#FACC15]" />
          )}
          <span>{listing.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}</span>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Zero-Pill Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2 font-medium">
            <span>{categoryName || 'General'}</span>
            <span aria-hidden="true" className="text-[#D6B36A]">·</span>
            <span>{listing.fulfillment_mode === 'automatic' ? 'Instant WhatsApp Link' : 'Verified Fulfillment'}</span>
          </div>

          <h3 className="font-display font-semibold text-base text-white group-hover:text-[#FACC15] transition-colors leading-snug line-clamp-2">
            {listing.name}
          </h3>

          <p className="mt-2 text-xs text-[#9CA3AF] line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        {/* Pricing & Action Footer */}
        <div className="pt-4 border-t border-[#1F2637] flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] block font-medium">
              WhatsApp Group/Channel Price
            </span>
            <span className="font-display font-extrabold text-base text-[#FACC15] font-mono tabular-nums">
              NGN {listing.price_ngn.toLocaleString('en-NG')}
            </span>
          </div>

          <Link
            to={`/marketplace/${listing.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-black" />
          </Link>
        </div>
      </div>
    </div>
  );
};
