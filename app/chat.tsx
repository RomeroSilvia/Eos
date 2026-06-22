import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AppState, Alert, FlatList, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import { ApiClientError, getFriendlyErrorMessage } from '@/services/api/client';
import { getCurrentProfile } from '@/services/auth';
import {
  getChatMessages,
  MAX_CHAT_IMAGE_SIZE_BYTES,
  markChatAsRead,
  normalizeChatMessage,
  parseChatMessage,
  sendChatImage,
  sendChatMessage,
  startChatVideoCall,
  type ChatParsedPayload,
  type ChatParticipant,
  type ChatMessage
} from '@/services/chat';
import { prepareSupabaseRealtimeClient } from '@/services/supabase';

const MAX_CHAT_MESSAGE_LENGTH = 1000;
const ALLOWED_CHAT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type SelectedChatImage = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

type ChatListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: ChatMessage };

export default function ChatScreen() {
  const params = useLocalSearchParams<{ relationId?: string | string[] }>();
  const relationIdFromParams = useMemo(() => {
    if (Array.isArray(params.relationId)) {
      return params.relationId[0];
    }

    return params.relationId;
  }, [params.relationId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedChatImage | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [localImageUrisById, setLocalImageUrisById] = useState<Record<string, string>>({});
  const [relationId, setRelationId] = useState<string | undefined>(relationIdFromParams);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isRealtimeSubscribed, setIsRealtimeSubscribed] = useState(false);
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const shouldScrollToEndRef = useRef(false);
  const pendingCallEndRef = useRef<{ relationId?: string; startedAt: string } | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const myUserIdRef = useRef<string | null>(null);
  const lastMarkAsReadAtRef = useRef(0);
  const failedImageUrlByIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setRelationId(relationIdFromParams);
    setMessages([]);
    setParticipant(null);
    setLocalImageUrisById({});
    setFailedImageIds(new Set());
    failedImageUrlByIdRef.current.clear();
  }, [relationIdFromParams]);

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    if (
      nextMessage.mediaUrl &&
      failedImageUrlByIdRef.current.get(nextMessage.id) !== nextMessage.mediaUrl
    ) {
      setFailedImageIds((prev) => removeFailedImageId(prev, nextMessage.id));
    }

    setMessages((prev) => {
      return mergeChatMessages(prev, [nextMessage], failedImageUrlByIdRef.current);
    });
  }, []);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    const idsWithNewMediaUrl = incoming
      .filter((message) => (
        Boolean(message.mediaUrl) &&
        failedImageUrlByIdRef.current.get(message.id) !== message.mediaUrl
      ))
      .map((message) => message.id);

    if (idsWithNewMediaUrl.length > 0) {
      setFailedImageIds((prev) => removeFailedImageIds(prev, idsWithNewMediaUrl));
    }

    setMessages((prev) => mergeChatMessages(prev, incoming, failedImageUrlByIdRef.current));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const profile = await getCurrentProfile();
        myUserIdRef.current = profile.id;
        setMyUserId(profile.id);
      } catch {
        myUserIdRef.current = null;
        setMyUserId(null);
      }
    })();
  }, []);

  const markChatAsReadInBackground = useCallback((nextRelationId?: string) => {
    if (!nextRelationId) {
      return;
    }

    const now = Date.now();

    if (now - lastMarkAsReadAtRef.current < 1500) {
      return;
    }

    lastMarkAsReadAtRef.current = now;
    void markChatAsRead(nextRelationId).catch(() => undefined);
  }, []);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await getChatMessages({ relationId, limit: 50 });
      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      mergeMessages(response.messages);
      markChatAsReadInBackground(response.relationId);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        setMessages([]);
        setParticipant(null);

        if (!relationIdFromParams) {
          setRelationId(undefined);
        }
      }

      Alert.alert('Chat', getFriendlyErrorMessage(error, 'No pudimos cargar los mensajes.'));
    } finally {
      setIsLoading(false);
    }
  }, [markChatAsReadInBackground, relationId, relationIdFromParams, mergeMessages]);

  const syncMessagesSilently = useCallback(async (nextRelationId = relationId) => {
    try {
      const response = await getChatMessages({ relationId: nextRelationId, limit: 50 });
      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      mergeMessages(response.messages);
      markChatAsReadInBackground(response.relationId);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404 && !relationIdFromParams) {
        setMessages([]);
        setParticipant(null);
        setRelationId(undefined);
      }

      // Fallback silencioso para no romper la UX del chat.
    }
  }, [markChatAsReadInBackground, relationId, relationIdFromParams, mergeMessages]);

  const handleImageError = useCallback((messageId: string, url: string) => {
    if (failedImageUrlByIdRef.current.get(messageId) !== url) {
      failedImageUrlByIdRef.current.set(messageId, url);
      void syncMessagesSilently();
      return;
    }

    setFailedImageIds((prev) => new Set(prev).add(messageId));
  }, [syncMessagesSilently]);

  const handleImageLoad = useCallback((messageId: string) => {
    failedImageUrlByIdRef.current.delete(messageId);
    setFailedImageIds((prev) => removeFailedImageId(prev, messageId));
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      void syncMessagesSilently();

      const intervalId = !isRealtimeSubscribed
        ? setInterval(() => {
          void syncMessagesSilently();
        }, 3000)
        : null;

      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        const wasBackground = appStateRef.current !== 'active';

        if (nextState === 'active') {
          if (wasBackground && pendingCallEndRef.current) {
            const pending = pendingCallEndRef.current;
            pendingCallEndRef.current = null;

            void sendChatMessage({
              relationId: pending.relationId,
              content: JSON.stringify({
                kind: 'call_ended',
                title: 'Videollamada finalizada'
              })
            })
              .then((response) => {
                setRelationId(response.relationId);
                appendMessage(response.message);
              })
              .catch(() => undefined);
          }

          void syncMessagesSilently();
        }

        appStateRef.current = nextState;
      });

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        appStateSubscription.remove();
      };
    }, [appendMessage, isRealtimeSubscribed, syncMessagesSilently])
  );

  useEffect(() => {
    if (!relationId) {
      setIsRealtimeSubscribed(false);
      return;
    }

    let channel: RealtimeChannel | null = null;
    let isMounted = true;
    setIsRealtimeSubscribed(false);

    void (async () => {
      const supabase = await prepareSupabaseRealtimeClient();

      if (!supabase || !isMounted) {
        return;
      }

      channel = supabase
        .channel(`chat:${relationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `relation_id=eq.${relationId}`
          },
          (payload) => {
            const nextMessage = normalizeChatMessage(payload.new as Partial<ChatMessage>);
            appendMessage(nextMessage);

            if (nextMessage.message_type === 'image' && !nextMessage.mediaUrl) {
              void syncMessagesSilently(relationId);
            }

            if (nextMessage.sender_id !== myUserIdRef.current) {
              markChatAsReadInBackground(relationId);
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) {
            return;
          }

          setIsRealtimeSubscribed(status === 'SUBSCRIBED');
        });
    })();

    return () => {
      isMounted = false;
      setIsRealtimeSubscribed(false);

      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [appendMessage, markChatAsReadInBackground, relationId, syncMessagesSilently]);

  async function handleSend() {
    if ((!messageText.trim() && !selectedImage) || isSending) {
      return;
    }

    const isImageMessage = Boolean(selectedImage);
    const imageToSend = selectedImage;
    setIsSending(true);

    try {
      const response = isImageMessage && imageToSend
        ? await sendChatImage({
          relationId,
          content: messageText,
          file: {
            uri: imageToSend.uri,
            name: imageToSend.name,
            type: imageToSend.type
          }
        })
        : await sendChatMessage({
          content: messageText,
          relationId
        });

      if (isImageMessage && imageToSend) {
        setLocalImageUrisById((prev) => ({
          ...prev,
          [response.message.id]: imageToSend.uri
        }));
      }

      setRelationId(response.relationId);
      appendMessage(response.message);
      setMessageText('');
      setSelectedImage(null);
      shouldScrollToEndRef.current = true;

      if (isImageMessage && !response.message.mediaUrl) {
        await syncMessagesSilently(response.relationId);
      }
    } catch (error) {
      Alert.alert('Chat', getFriendlyErrorMessage(error, 'No pudimos enviar el mensaje.'));
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickImage() {
    if (isSending) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Chat', 'Necesitamos permiso para acceder a tus imagenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 1
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const type = asset.mimeType ?? getImageMimeType(asset.uri);
    const size = asset.fileSize ?? asset.file?.size ?? null;

    if (!ALLOWED_CHAT_IMAGE_MIME_TYPES.includes(type)) {
      Alert.alert('Chat', 'Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }

    if (size !== null && size > MAX_CHAT_IMAGE_SIZE_BYTES) {
      Alert.alert('Chat', 'La imagen no puede superar los 15 MB.');
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      name: asset.fileName ?? `chat-image-${Date.now()}.${extensionFromMimeType(type)}`,
      type,
      size
    });
  }

  async function handleStartVideoCall() {
    if (isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await startChatVideoCall({ relationId });
      setRelationId(response.relationId);
      appendMessage(response.message);
      pendingCallEndRef.current = {
        relationId: response.relationId,
        startedAt: new Date().toISOString()
      };
      await Linking.openURL(response.callUrl);
    } catch (error) {
      Alert.alert('Chat', getFriendlyErrorMessage(error, 'No pudimos iniciar la videollamada.'));
    } finally {
      setIsSending(false);
    }
  }

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at));
  }, [messages]);

  const chatItems = useMemo(() => {
    const items: ChatListItem[] = [];

    let currentDateKey: string | null = null;

    for (const message of orderedMessages) {
      const dateKey = toDateKey(message.created_at);

      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
        items.push({
          type: 'date',
          id: `date-${dateKey}`,
          label: formatChatDate(message.created_at)
        });
      }

      items.push({
        type: 'message',
        id: message.id,
        message
      });
    }

    return items;
  }, [orderedMessages]);

  const chatListExtraData = useMemo(
    () => ({ failedImageIds, localImageUrisById, myUserId }),
    [failedImageIds, localImageUrisById, myUserId]
  );

  const handleContentSizeChange = useCallback(() => {
    if (!shouldScrollToEndRef.current) {
      return;
    }

    shouldScrollToEndRef.current = false;
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderChatItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'date') {
      return <ChatDateSeparator label={item.label} />;
    }

    const message = item.message;
    const isMine = myUserId === message.sender_id;
    const imageFailed = failedImageIds.has(message.id);
    const localImageUri = localImageUrisById[message.id];
    const parsed = parseChatMessage(message);
    const imageUri = imageFailed ? localImageUri : parsed.url ?? localImageUri;

    return (
      <ChatMessageBubble
        imageUri={imageUri}
        isLocalImage={Boolean(imageUri && imageUri === localImageUri)}
        isMine={isMine}
        message={message}
        onImageError={handleImageError}
        onImageLoad={handleImageLoad}
        parsed={parsed}
      />
    );
  }, [failedImageIds, handleImageError, handleImageLoad, localImageUrisById, myUserId]);

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Consultas" style={styles.header} title="Chat" />
      <View style={styles.participantCard}>
        <View style={styles.participantIconWrap}>
          <Ionicons color={colors.primaryDark} name="person-circle-outline" size={22} />
        </View>
        <View style={styles.participantTextBlock}>
          <Text style={styles.participantLabel}>Estas chateando con</Text>
          <Text style={styles.participantName}>{formatParticipantName(participant)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Iniciar videollamada"
          accessibilityRole="button"
          disabled={isSending}
          onPress={() => void handleStartVideoCall()}
          style={({ pressed }) => [
            styles.videoCallHeaderButton,
            pressed && styles.iconActionPressed,
            isSending && styles.iconActionDisabled
          ]}
        >
          <Ionicons color={colors.surface} name="videocam-outline" size={16} />
          <Text style={styles.videoCallHeaderText}>Llamar</Text>
        </Pressable>
      </View>

      {isLoading ? <Text style={styles.info}>Cargando mensajes...</Text> : null}

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.list}
        data={chatItems}
        extraData={chatListExtraData}
        keyExtractor={(item) => item.id}
        onContentSizeChange={handleContentSizeChange}
        renderItem={renderChatItem}
      />

      <View style={styles.composer}>
        {selectedImage ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <View style={styles.previewTextBlock}>
              <Text style={styles.previewTitle} numberOfLines={1}>Imagen seleccionada</Text>
              <Text style={styles.previewMeta}>{formatImageSize(selectedImage.size)}</Text>
            </View>
            <Pressable
              accessibilityLabel="Quitar imagen"
              accessibilityRole="button"
              disabled={isSending}
              onPress={() => setSelectedImage(null)}
              style={({ pressed }) => [styles.previewRemoveButton, pressed && styles.iconActionPressed]}
            >
              <Ionicons color={colors.textPrimary} name="close-outline" size={20} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <Pressable
            accessibilityLabel="Adjuntar imagen"
            accessibilityRole="button"
            disabled={isSending}
            onPress={() => void handlePickImage()}
            style={({ pressed }) => [
              styles.iconActionButton,
              pressed && styles.iconActionPressed,
              isSending && styles.iconActionDisabled
            ]}
          >
            <Ionicons color={colors.primaryDark} name="image-outline" size={20} />
          </Pressable>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            placeholder="Escribi tu mensaje"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <Button onPress={handleSend} disabled={isSending || (!messageText.trim() && !selectedImage)}>
          {isSending ? 'Enviando...' : 'Enviar'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const ChatDateSeparator = memo(function ChatDateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSeparatorWrap}>
      <Text style={styles.dateSeparatorText}>{label}</Text>
    </View>
  );
});

type ChatMessageBubbleProps = {
  imageUri?: string;
  isLocalImage: boolean;
  isMine: boolean;
  message: ChatMessage;
  onImageError: (messageId: string, url: string) => void;
  onImageLoad: (messageId: string) => void;
  parsed: ChatParsedPayload;
};

const ChatMessageBubble = memo(function ChatMessageBubble({
  imageUri,
  isLocalImage,
  isMine,
  message,
  onImageError,
  onImageLoad,
  parsed
}: ChatMessageBubbleProps) {
  return (
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
      {parsed.kind === 'text' ? (
        <Text style={[styles.bubbleText, isMine ? styles.mineText : styles.theirsText]}>{parsed.text}</Text>
      ) : null}

      {parsed.kind === 'image' ? (
        <View style={styles.imageMessageWrap}>
          {parsed.text ? (
            <Text style={[styles.bubbleText, isMine ? styles.mineText : styles.theirsText]}>{parsed.text}</Text>
          ) : null}
          {imageUri ? (
            <Image
              source={{ cache: isLocalImage ? 'default' : 'reload', uri: imageUri }}
              onLoad={() => onImageLoad(message.id)}
              onError={() => onImageError(message.id, imageUri)}
              resizeMode="cover"
              style={styles.chatImage}
            />
          ) : (
            <View style={[styles.imageFallback, isMine ? styles.imageFallbackMine : styles.imageFallbackTheirs]}>
              <Ionicons color={isMine ? colors.surface : colors.textMuted} name="image-outline" size={22} />
              <Text style={[styles.imageFallbackText, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
                No se pudo cargar la imagen.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {parsed.kind === 'call_invite' && parsed.url ? (
        <View style={[styles.callInviteWrap, isMine ? styles.callInviteMine : styles.callInviteTheirs]}>
          <View style={styles.callInviteHeaderRow}>
            <View style={styles.callInviteIconWrap}>
              <Ionicons
                color={isMine ? colors.surface : colors.primaryDark}
                name="videocam-outline"
                size={16}
              />
            </View>
            <Text style={[styles.callInviteBadge, isMine ? styles.mineText : styles.theirsText]}>
              Videollamada
            </Text>
          </View>

          <Text style={[styles.callInviteText, isMine ? styles.mineText : styles.theirsText]}>
            {parsed.title ?? 'Te invitaron a una videollamada'}
          </Text>
          <Text style={[styles.callInviteHint, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
            Toca el boton para unirte ahora.
          </Text>

          <Button onPress={() => parsed.url ? void Linking.openURL(parsed.url) : undefined} variant={isMine ? 'secondary' : 'primary'}>
            Unirse a la videollamada
          </Button>
        </View>
      ) : null}

      {parsed.kind === 'call_ended' ? (
        <View style={[styles.callEndedWrap, isMine ? styles.callInviteMine : styles.callInviteTheirs]}>
          <Text style={[styles.callEndedText, isMine ? styles.mineText : styles.theirsText]}>
            {parsed.title ?? 'Videollamada finalizada'}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.messageTime, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
        {formatMessageTime(message.created_at)}
      </Text>
    </View>
  );
}, areChatMessageBubblePropsEqual);

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 16
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 0
  },
  info: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10
  },
  participantCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  participantIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  participantTextBlock: {
    flex: 1,
    gap: 2
  },
  participantLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  participantName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  videoCallHeaderButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12
  },
  videoCallHeaderText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800'
  },
  list: {
    flexGrow: 1,
    gap: 8,
    paddingBottom: 12
  },
  dateSeparatorWrap: {
    alignItems: 'center',
    marginVertical: 4
  },
  dateSeparatorText: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  bubble: {
    borderRadius: 14,
    maxWidth: '84%',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20
  },
  mineText: {
    color: colors.surface
  },
  mineTextSoft: {
    color: colors.surface,
    opacity: 0.85
  },
  theirsText: {
    color: colors.textPrimary
  },
  theirsTextSoft: {
    color: colors.textSecondary
  },
  messageTime: {
    alignSelf: 'flex-end',
    fontSize: 11,
    marginTop: 6
  },
  composer: {
    gap: 10
  },
  composerRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 8
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  iconActionPressed: {
    opacity: 0.75
  },
  iconActionDisabled: {
    opacity: 0.5
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12
  },
  imageMessageWrap: {
    gap: 8
  },
  chatImage: {
    borderRadius: 10,
    height: 180,
    width: 220
  },
  imageFallback: {
    alignItems: 'center',
    borderRadius: 10,
    gap: 6,
    height: 140,
    justifyContent: 'center',
    padding: 12,
    width: 220
  },
  imageFallbackMine: {
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  imageFallbackTheirs: {
    backgroundColor: colors.surfaceSoft
  },
  imageFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  previewCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 8
  },
  previewImage: {
    borderRadius: 8,
    height: 48,
    width: 48
  },
  previewTextBlock: {
    flex: 1,
    gap: 2
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  previewMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  previewRemoveButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  callInviteWrap: {
    borderRadius: 10,
    gap: 8,
    padding: 10
  },
  callInviteMine: {
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  callInviteTheirs: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  callInviteHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  callInviteIconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24
  },
  callInviteBadge: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  callInviteText: {
    fontSize: 14,
    fontWeight: '700'
  },
  callInviteHint: {
    fontSize: 12,
    lineHeight: 16
  },
  callEndedWrap: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  callEndedText: {
    fontSize: 13,
    fontWeight: '700'
  }
});

function formatParticipantName(participant: ChatParticipant | null): string {
  if (!participant) {
    return 'Tu especialista';
  }

  return participant.fullName ?? participant.email ?? 'Usuario';
}

function toDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatChatDate(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatMessageTime(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getImageMimeType(uri: string): string {
  const normalized = uri.toLowerCase();

  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function formatImageSize(size?: number | null): string {
  if (!size) {
    return 'Lista para enviar';
  }

  const sizeInMb = size / (1024 * 1024);

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}

function getTimeValue(value: string): number {
  const parsed = new Date(value).getTime();

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function mergeChatMessages(
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
  failedImageUrlById: Map<string, string>
): ChatMessage[] {
  if (incomingMessages.length === 0) {
    return currentMessages;
  }

  let nextMessages = currentMessages;
  let changed = false;

  for (const incoming of incomingMessages) {
    const existingIndex = nextMessages.findIndex((message) => message.id === incoming.id);

    if (existingIndex < 0) {
      if (!changed) {
        nextMessages = [...nextMessages];
      }

      nextMessages.push(incoming);
      changed = true;
      continue;
    }

    const current = nextMessages[existingIndex];
    const merged = mergeChatMessage(current, incoming, failedImageUrlById);

    if (merged !== current) {
      if (!changed) {
        nextMessages = [...nextMessages];
      }

      nextMessages[existingIndex] = merged;
      changed = true;
    }
  }

  if (!changed) {
    return currentMessages;
  }

  return nextMessages.sort((a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at));
}

function mergeChatMessage(
  current: ChatMessage,
  incoming: ChatMessage,
  failedImageUrlById: Map<string, string>
): ChatMessage {
  const incomingMediaUrl = incoming.mediaUrl ?? null;
  const currentMediaUrl = current.mediaUrl ?? null;
  const mediaUrl = currentMediaUrl && failedImageUrlById.get(current.id) !== currentMediaUrl
    ? currentMediaUrl
    : incomingMediaUrl || currentMediaUrl;

  const merged: ChatMessage = {
    ...current,
    ...incoming,
    content: incoming.content,
    message_type: incoming.message_type ?? current.message_type,
    mediaUrl,
    mediaAvailable: incoming.mediaAvailable ?? current.mediaAvailable,
    media_mime_type: incoming.media_mime_type ?? current.media_mime_type,
    media_size: incoming.media_size ?? current.media_size,
    read_at: incoming.read_at ?? current.read_at,
    created_at: incoming.created_at || current.created_at
  };

  return areChatMessagesEqual(current, merged) ? current : merged;
}

function areChatMessagesEqual(current: ChatMessage, next: ChatMessage): boolean {
  return (
    current.id === next.id &&
    current.relation_id === next.relation_id &&
    current.sender_id === next.sender_id &&
    current.content === next.content &&
    current.message_type === next.message_type &&
    current.mediaUrl === next.mediaUrl &&
    current.mediaAvailable === next.mediaAvailable &&
    current.media_mime_type === next.media_mime_type &&
    current.media_size === next.media_size &&
    current.read_at === next.read_at &&
    current.created_at === next.created_at
  );
}

function areChatMessageBubblePropsEqual(
  current: ChatMessageBubbleProps,
  next: ChatMessageBubbleProps
): boolean {
  return (
    current.message === next.message &&
    current.parsed.kind === next.parsed.kind &&
    current.parsed.text === next.parsed.text &&
    current.parsed.url === next.parsed.url &&
    current.parsed.title === next.parsed.title &&
    current.imageUri === next.imageUri &&
    current.isLocalImage === next.isLocalImage &&
    current.isMine === next.isMine &&
    current.onImageError === next.onImageError &&
    current.onImageLoad === next.onImageLoad
  );
}

function removeFailedImageId(current: Set<string>, id: string): Set<string> {
  if (!current.has(id)) {
    return current;
  }

  const next = new Set(current);
  next.delete(id);
  return next;
}

function removeFailedImageIds(current: Set<string>, ids: string[]): Set<string> {
  if (!ids.some((id) => current.has(id))) {
    return current;
  }

  const next = new Set(current);

  for (const id of ids) {
    next.delete(id);
  }

  return next;
}

