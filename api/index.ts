import app from '../server.ts';

/**
 * Vercel's static Vite deployment does not register a plain dynamic API
 * catch-all file reliably. vercel.json rewrites every /api/* request to this
 * concrete function and carries the original API path in __route.
 */
export default function handler(req: any, res: any) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const route = requestUrl.searchParams.get('__route');

  if (!route || route.startsWith('/') || route.split('/').some((part) => part === '..')) {
    return res.status(404).json({ error: 'API route not found.' });
  }

  requestUrl.searchParams.delete('__route');
  req.url = `/api/${route}${requestUrl.search}`;
  return app(req, res);
}
