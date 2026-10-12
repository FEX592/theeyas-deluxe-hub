import crypto from 'crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'listing-covers';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function detectImageType(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

async function ensureBucket(): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_IMAGE_BYTES,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  });
  if (response.ok || response.status === 409) return;
  const detail = (await response.text()).slice(0, 300);
  throw new Error(`Could not prepare image storage (${response.status}): ${detail}`);
}

export async function uploadListingCover(mimeType: string, base64Data: string): Promise<{ url: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Listing image uploads are not configured on this deployment.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (typeof base64Data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data) || base64Data.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
    throw new Error('The image upload is invalid or larger than 5 MB.');
  }

  const image = Buffer.from(base64Data, 'base64');
  if (!image.length || image.length > MAX_IMAGE_BYTES) throw new Error('Choose an image no larger than 5 MB.');
  const detected = detectImageType(image);
  if (!detected || detected.mime !== mimeType) throw new Error('The selected file is not a valid JPG, PNG, or WebP image.');

  await ensureBucket();
  const objectName = `${crypto.randomUUID()}.${detected.extension}`;
  const path = `${BUCKET}/${objectName}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': detected.mime,
      'x-upsert': 'false',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: new Uint8Array(image),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Image upload failed (${response.status}): ${detail}`);
  }

  return { url: `${SUPABASE_URL}/storage/v1/object/public/${path}` };
}
