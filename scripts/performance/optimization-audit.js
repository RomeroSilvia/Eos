const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const checks = [
  { id: 'home-ttl-30s', file: 'hooks/useHome.ts', patterns: [/STALE_AFTER_MS\s*=\s*30_000/, /lastFetchedAt/] },
  { id: 'products-ttl-30s', file: 'hooks/useProducts.ts', patterns: [/STALE_AFTER_MS\s*=\s*30_000/, /lastFetchedAt/] },
  { id: 'notifications-cross-instance-dedup', file: 'hooks/useHasUnreadNotifications.ts', patterns: [/CACHE_TTL_MS\s*=\s*30_000/, /inflight/, /invalidateUnreadCache/] },
  { id: 'chat-memory-disk-dedup', file: 'services/chatImageCache.ts', patterns: [/localUriByCacheKey/, /inFlightDownloadByCacheKey/, /downloadAsync/] },
  { id: 'specialist-image-compression', file: 'services/specialist.ts', patterns: [/resize:\s*\{\s*width:\s*1280/, /compress:\s*0\.7/, /5\s*\*\s*1024\s*\*\s*1024/] },
  { id: 'product-image-compression', file: 'app/products/create.tsx', patterns: [/resize:\s*\{\s*width:\s*1280/, /compress:\s*0\.7/, /base64:\s*true/] },
  { id: 'notification-scheduling-mutex', file: 'services/notifications.ts', patterns: [/schedulingPromise/, /await schedulingPromise/, /schedulingPromise\s*=\s*null/] }
];

function audit(root = ROOT) {
  return checks.map((check) => {
    const source = fs.readFileSync(path.join(root, check.file), 'utf8');
    const missing = check.patterns.filter((pattern) => !pattern.test(source)).map(String);
    return { id: check.id, file: check.file, status: missing.length ? 'FAIL' : 'PASS', missing };
  });
}

if (require.main === module) {
  const results = audit();
  console.table(results.map(({ id, file, status }) => ({ id, file, status })));
  if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1;
}

module.exports = { audit, checks };
