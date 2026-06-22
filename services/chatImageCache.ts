import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CHAT_MEDIA_CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}chat-media`;

const localUriByCacheKey = new Map<string, string>();
const inFlightDownloadByCacheKey = new Map<string, Promise<string | null>>();
let cacheDirEnsured = false;

type ResolveCachedChatImageInput = {
  messageId: string;
  mediaPath?: string | null;
  remoteUrl?: string | null;
  getRemoteUrl?: () => Promise<string | null>;
};

export async function resolveCachedChatImage(input: ResolveCachedChatImageInput): Promise<string | null> {
  const cacheKey = input.mediaPath ?? input.messageId;

  if (!cacheKey) {
    return null;
  }

  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    if (input.remoteUrl) {
      return input.remoteUrl;
    }

    if (!input.getRemoteUrl) {
      return null;
    }

    if (__DEV__) {
      console.log('[chat-image-cache] remote url requested', cacheKey);
    }

    return input.getRemoteUrl();
  }

  const normalizedCacheKey = sanitizeCacheKey(cacheKey);
  const extension = extensionFromUrl(input.remoteUrl ?? '');
  const fileUri = `${CHAT_MEDIA_CACHE_DIR}/${normalizedCacheKey}.${extension}`;

  const inMemoryHit = localUriByCacheKey.get(normalizedCacheKey);

  if (inMemoryHit) {
    const existing = await safeGetInfo(inMemoryHit);

    if (existing?.exists) {
      if (__DEV__) {
        console.log('[chat-image-cache] memory hit', normalizedCacheKey);
      }

      return inMemoryHit;
    }

    localUriByCacheKey.delete(normalizedCacheKey);
  }

  const diskInfo = await safeGetInfo(fileUri);

  if (diskInfo?.exists) {
    localUriByCacheKey.set(normalizedCacheKey, fileUri);

    if (__DEV__) {
      console.log('[chat-image-cache] disk hit', normalizedCacheKey);
    }

    return fileUri;
  }

  let remoteUrl = input.remoteUrl ?? null;

  if (!remoteUrl && input.getRemoteUrl) {
    if (__DEV__) {
      console.log('[chat-image-cache] remote url requested', normalizedCacheKey);
    }

    remoteUrl = await input.getRemoteUrl();
  }

  if (!remoteUrl) {
    return null;
  }

  if (remoteUrl.startsWith('file://')) {
    return remoteUrl;
  }

  const existingInFlight = inFlightDownloadByCacheKey.get(normalizedCacheKey);

  if (existingInFlight) {
    return existingInFlight;
  }

  const downloadPromise = (async () => {
    await ensureCacheDirectory();

    if (__DEV__) {
      console.log('[chat-image-cache] download', normalizedCacheKey);
    }

    const result = await FileSystem.downloadAsync(remoteUrl, fileUri);

    if (result.status < 200 || result.status >= 300) {
      return null;
    }

    localUriByCacheKey.set(normalizedCacheKey, fileUri);
    return fileUri;
  })()
    .catch(() => null)
    .finally(() => {
      inFlightDownloadByCacheKey.delete(normalizedCacheKey);
    });

  inFlightDownloadByCacheKey.set(normalizedCacheKey, downloadPromise);
  return downloadPromise;
}

async function ensureCacheDirectory(): Promise<void> {
  if (cacheDirEnsured || Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    return;
  }

  await FileSystem.makeDirectoryAsync(CHAT_MEDIA_CACHE_DIR, { intermediates: true });
  cacheDirEnsured = true;
}

function extensionFromUrl(url: string): string {
  const lower = url.toLowerCase();

  if (lower.includes('.png')) return 'png';
  if (lower.includes('.webp')) return 'webp';

  return 'jpg';
}

function sanitizeCacheKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

async function safeGetInfo(uri: string): Promise<FileSystem.FileInfo | null> {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch {
    return null;
  }
}
