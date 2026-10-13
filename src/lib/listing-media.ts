import type { Listing, ListingMediaItem } from '../types.ts';

export type { ListingMediaItem };
export type ListingWithMedia = Pick<Listing, 'gallery_media'>;
