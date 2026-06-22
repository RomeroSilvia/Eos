import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { getChatImageSignedUrl } from '@/services/chat';
import { resolveCachedChatImage } from '@/services/chatImageCache';

type ChatImageProps = {
  messageId: string;
  mediaPath?: string | null;
  mediaUrl?: string | null;
  relationId?: string;
  role?: string | null;
};

export const ChatImage = memo(function ChatImage({
  messageId,
  mediaPath,
  mediaUrl,
  relationId,
  role
}: ChatImageProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const renderCountRef = useRef(0);

  renderCountRef.current += 1;

  if (__DEV__ && renderCountRef.current <= 6) {
    console.log('[chat-image] render', messageId, renderCountRef.current);
  }

  useEffect(() => {
    let isMounted = true;

    const resolve = async () => {
      setIsLoading(true);
      setHasError(false);

      let nextRemoteUrl = mediaUrl ?? null;

      if (__DEV__) {
        console.log('[chat-image] role:', role ?? 'unknown');
        console.log('[chat-image] messageId:', messageId);
        console.log('[chat-image] mediaPath:', mediaPath ?? null);
        console.log('[chat-image] mediaUrl:', mediaUrl ?? null);
      }

      if (!isMounted) {
        return;
      }

      const cacheKey = mediaPath ?? messageId;
      const localUri = await resolveCachedChatImage({
        messageId,
        mediaPath,
        remoteUrl: nextRemoteUrl,
        getRemoteUrl: nextRemoteUrl
          ? undefined
          : async () => getChatImageSignedUrl({ messageId, relationId })
      });

      if (!isMounted) {
        return;
      }

      const finalUri = localUri ?? nextRemoteUrl;

      if (!finalUri) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      if (__DEV__) {
        console.log('[chat-image] resolvedUri:', finalUri);
      }

      setResolvedUri((prev) => (prev === finalUri ? prev : finalUri));
      setIsLoading(false);
    };

    void resolve().catch(() => {
      if (!isMounted) {
        return;
      }

      setHasError(true);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [mediaPath, mediaUrl, messageId, relationId, role]);

  if (!resolvedUri && isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primaryDark} size="small" />
        <Text style={styles.loadingText}>Cargando imagen...</Text>
      </View>
    );
  }

  if (!resolvedUri || hasError) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={styles.fallbackText}>No se pudo cargar la imagen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.imageWrap}>
      <Image
        source={{ uri: resolvedUri }}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          setHasError(false);
          setIsLoading(false);
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        resizeMode="cover"
        style={styles.image}
      />
      {isLoading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
        </View>
      ) : null}
    </View>
  );
}, areEqual);

function areEqual(prev: ChatImageProps, next: ChatImageProps): boolean {
  return (
    prev.messageId === next.messageId &&
    prev.mediaPath === next.mediaPath &&
    prev.mediaUrl === next.mediaUrl &&
    prev.relationId === next.relationId &&
    prev.role === next.role
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: 10,
    height: 180,
    overflow: 'hidden',
    width: 220
  },
  image: {
    borderRadius: 10,
    height: 180,
    width: 220
  },
  loadingWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    gap: 6,
    height: 140,
    justifyContent: 'center',
    width: 220
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  fallbackWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    height: 140,
    justifyContent: 'center',
    paddingHorizontal: 10,
    width: 220
  },
  fallbackText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject
  }
});
