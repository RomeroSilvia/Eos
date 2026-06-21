import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [relationId, setRelationId] = useState<string | undefined>(relationIdFromParams);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const shouldScrollToEndRef = useRef(false);
  const pendingCallEndRef = useRef<{ relationId?: string; startedAt: string } | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    setRelationId(relationIdFromParams);
  }, [relationIdFromParams]);

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((message) => message.id === nextMessage.id)) {
        return prev;
      }

      return [...prev, nextMessage].sort(
        (a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at)
      );
    });
  }, []);

  const replaceMessages = useCallback((incoming: ChatMessage[]) => {
    const byId = new Map<string, ChatMessage>();

    for (const message of incoming) {
      byId.set(message.id, message);
    }

    setMessages(
      [...byId.values()].sort((a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at))
    );
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const profile = await getCurrentProfile();
        setMyUserId(profile.id);
      } catch {
        setMyUserId(null);
      }
    })();
  }, []);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await getChatMessages({ relationId, limit: 50 });
      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      replaceMessages(response.messages);
      await markChatAsRead(response.relationId);
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
  }, [relationId, relationIdFromParams, replaceMessages]);

  const syncMessagesSilently = useCallback(async (nextRelationId = relationId) => {
    try {
      const response = await getChatMessages({ relationId: nextRelationId, limit: 50 });
      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      replaceMessages(response.messages);
      await markChatAsRead(response.relationId);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404 && !relationIdFromParams) {
        setMessages([]);
        setParticipant(null);
        setRelationId(undefined);
      }

      // Fallback silencioso para no romper la UX del chat.
    }
  }, [relationId, relationIdFromParams, replaceMessages]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      void syncMessagesSilently();

      const intervalId = setInterval(() => {
        void syncMessagesSilently();
      }, 3000);

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
        clearInterval(intervalId);
        appStateSubscription.remove();
      };
    }, [appendMessage, syncMessagesSilently])
  );

  useEffect(() => {
    if (!relationId) {
      return;
    }

    let channel: RealtimeChannel | null = null;
    let isMounted = true;

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

            if (nextMessage.message_type === 'image') {
              void syncMessagesSilently();
            }

            if (nextMessage.sender_id !== myUserId) {
              void markChatAsRead(relationId).catch(() => undefined);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;

      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [appendMessage, myUserId, relationId, syncMessagesSilently]);

  async function handleSend() {
    if ((!messageText.trim() && !selectedImage) || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = selectedImage
        ? await sendChatImage({
          relationId,
          content: messageText,
          file: {
            uri: selectedImage.uri,
            name: selectedImage.name,
            type: selectedImage.type
          }
        })
        : await sendChatMessage({
          content: messageText,
          relationId
        });

      setRelationId(response.relationId);
      appendMessage(response.message);
      setMessageText('');
      setSelectedImage(null);
      shouldScrollToEndRef.current = true;
      await syncMessagesSilently(response.relationId);
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
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => {
          if (!shouldScrollToEndRef.current) {
            return;
          }

          shouldScrollToEndRef.current = false;
          listRef.current?.scrollToEnd({ animated: true });
        }}
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateSeparatorWrap}>
                <Text style={styles.dateSeparatorText}>{item.label}</Text>
              </View>
            );
          }

          const message = item.message;
          const isMine = myUserId === message.sender_id;
          const parsed = parseChatMessage(message);
          const imageFailed = failedImageIds.has(message.id);

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
                  {parsed.url && !imageFailed ? (
                    <Image
                      source={{ uri: parsed.url }}
                      onError={() => setFailedImageIds((prev) => new Set(prev).add(message.id))}
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
        }}
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

