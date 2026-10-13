import React, { useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../lib/api.ts';
import { ListingMediaItem } from '../lib/listing-media.ts';

const MAX_ITEMS = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ListingMediaGalleryEditorProps {
  media: ListingMediaItem[];
  onChange: React.Dispatch<React.SetStateAction<ListingMediaItem[]>>;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}

export const ListingMediaGalleryEditor: React.FC<ListingMediaGalleryEditorProps> = ({
  media,
  onChange,
  onUploadingChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!files.length) return;
    setError(null);

    if (media.length + files.length > MAX_ITEMS) {
      setError(`A listing can have up to ${MAX_ITEMS} gallery photos.`);
      return;
    }
    for (const file of files) {
      if (!ALLOWED_IMAGES.has(file.type)) {
        setError('Choose JPG, PNG, or WebP photos.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError('Gallery photos must be 5 MB or smaller.');
        return;
      }
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      for (const file of files) {
        const uploaded = await api.uploadListingMedia(file);
        onChange((current) => [...current, {
          url: uploaded.public_url,
          kind: 'image',
          name: file.name,
        }]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'A photo upload failed.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const removeItem = (index: number) => {
    onChange((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section className="md:col-span-2 space-y-3" aria-labelledby="listing-gallery-label">
      <div>
        <h3 id="listing-gallery-label" className="text-xs font-semibold text-[#9CA3AF]">Photo gallery</h3>
        <p className="mt-1 text-[11px] leading-5 text-[#6B7280]">Add up to 10 gallery photos. JPG, PNG, or WebP; up to 5 MB each.</p>
      </div>

      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#364057] bg-[#0B0F17] px-4 py-5 text-sm font-semibold text-white transition hover:border-[#FACC15]/70 hover:bg-[#111622] ${disabled || uploading ? 'cursor-wait opacity-60' : ''}`}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[#FACC15]" /> : <ImagePlus className="h-4 w-4 text-[#FACC15]" />}
        {uploading ? 'Uploading photos…' : 'Add photos'}
        <input
          className="sr-only"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploading || media.length >= MAX_ITEMS}
          onChange={(event) => void handleFiles(event)}
        />
      </label>

      {error && <p role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">{error}</p>}

      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Listing gallery photos">
          {media.map((item, index) => (
            <li key={`${item.url}-${index}`} className="relative overflow-hidden rounded-xl border border-[#1E2638] bg-[#0B0F17]">
              <img src={item.url} alt={item.name || `Gallery photo ${index + 1}`} className="aspect-video w-full bg-black object-contain" />
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#9CA3AF]">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                  <span className="truncate">{item.name || `Photo ${index + 1}`}</span>
                </span>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => removeItem(index)}
                  aria-label={`Remove gallery photo ${index + 1}`}
                  className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
