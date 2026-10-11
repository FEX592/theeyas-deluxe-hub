import { useEffect } from 'react';

export function useCatalogRealtime(onChanged: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return;

    const source = new EventSource('/api/realtime/catalog');
    let lastVersion = '';

    const reconcile = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { version?: string };
        if (payload.version && payload.version === lastVersion) return;
        if (payload.version) lastVersion = payload.version;
        onChanged();
      } catch {
        // Ignore malformed keep-alive frames; the next valid event reconciles state.
      }
    };

    source.addEventListener('ready', reconcile);
    source.addEventListener('catalog_changed', reconcile);
    // EventSource automatically retries after disconnects. The server computes a
    // fresh catalog version on reconnect, so missed events are reconciled safely.

    return () => {
      source.close();
    };
  }, [onChanged]);
}
