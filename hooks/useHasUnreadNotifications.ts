import { useEffect, useState } from 'react';
import { getNotifications } from '@/services/notifications';

// Caché compartida entre todas las instancias del hook para no hacer N llamadas paralelas
let cachedHasUnread: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

let inflight: Promise<boolean> | null = null;

async function fetchHasUnread(): Promise<boolean> {
  if (inflight) return inflight;

  inflight = getNotifications()
    .then((ns) => ns.some((n) => !n.isRead))
    .catch(() => false)
    .finally(() => { inflight = null; });

  return inflight;
}

export function useHasUnreadNotifications() {
  const [hasUnread, setHasUnread] = useState<boolean>(cachedHasUnread ?? false);

  useEffect(() => {
    const now = Date.now();
    if (cachedHasUnread !== null && now - cacheTimestamp < CACHE_TTL_MS) {
      setHasUnread(cachedHasUnread);
      return;
    }

    fetchHasUnread().then((result) => {
      cachedHasUnread = result;
      cacheTimestamp = Date.now();
      setHasUnread(result);
    });
  }, []);

  return hasUnread;
}

export function invalidateUnreadCache() {
  cachedHasUnread = null;
  cacheTimestamp = 0;
}
