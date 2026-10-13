import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { ListingMediaItem } from '../lib/listing-media.ts';

interface ListingMediaGalleryProps {
  coverUrl: string;
  title: string;
  media?: ListingMediaItem[];
}

export const ListingMediaGallery: React.FC<ListingMediaGalleryProps> = ({ coverUrl, title, media = [] }) => {
  const items = useMemo<ListingMediaItem[]>(() => [
    ...(coverUrl ? [{ url: coverUrl, kind: 'image' as const, name: `${title} cover` }] : []),
    ...media.filter((item) => item.url && item.url !== coverUrl),
  ], [coverUrl, media, title]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const selected = items[selectedIndex];

  useEffect(() => {
    setSelectedIndex(0);
  }, [coverUrl, media]);

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [viewerOpen]);

  if (!items.length) {
    return <div className="aspect-[16/10] w-full rounded-2xl border border-[#1E2638] bg-[#111622]" aria-label="No listing photos" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#1E2638] bg-[#07090E] shadow-xl">
        {selected && (
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label="Open image full screen"
            className="absolute inset-0 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#FACC15]"
          >
            <img
              src={selected.url}
              alt={selected.name || title}
              referrerPolicy="no-referrer"
              className="h-full w-full bg-[#07090E] object-contain"
            />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Listing photo gallery">
          {items.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={`relative h-[72px] w-[112px] shrink-0 overflow-hidden rounded-xl border bg-black transition ${selectedIndex === index ? 'border-[#FACC15] ring-1 ring-[#FACC15]/50' : 'border-[#1E2638] hover:border-[#65708A]'}`}
            >
              <img src={item.url} alt="" className="h-full w-full object-contain" />
              {index > 0 && <ImageIcon className="absolute bottom-1 right-1 h-3.5 w-3.5 text-white drop-shadow" />}
            </button>
          ))}
        </div>
      )}

      {viewerOpen && selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo viewer`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-8"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setViewerOpen(false); }}
        >
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/70 p-2.5 text-white transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={selected.url}
            alt={selected.name || title}
            referrerPolicy="no-referrer"
            className="max-h-[92vh] max-w-full object-contain"
          />
        </div>
      )}
    </div>
  );
};
