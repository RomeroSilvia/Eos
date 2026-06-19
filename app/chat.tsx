import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AppState, Alert, FlatList, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { ApiClientError } from '@/services/api/client';
import { getCurrentProfile } from '@/services/auth';
import {
  getChatMessages,
  markChatAsRead,
  parseChatMessage,
  sendChatMedia,
  sendChatMessage,
  startChatVideoCall,
  type ChatParticipant,
  type ChatMessage
} from '@/services/chat';
import { prepareSupabaseRealtimeClient } from '@/services/supabase';

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
  const [relationId, setRelationId] = useState<string | undefined>(relationIdFromParams);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
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

      return [...prev, nextMessage];
    });
  }, []);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      if (incoming.length === 0) {
        return prev;
      }

      const byId = new Map(prev.map((message) => [message.id, message]));

      for (const message of incoming) {
        byId.set(message.id, message);
      }

      return [...byId.values()].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
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
      mergeMessages(response.messages);
      await markChatAsRead(response.relationId);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        setMessages([]);
        setParticipant(null);

        if (!relationIdFromParams) {
          setRelationId(undefined);
        }
      }

      Alert.alert('Chat', error instanceof Error ? error.message : 'No pudimos cargar los mensajes.');
    } finally {
      setIsLoading(false);
    }
  }, [mergeMessages, relationId, relationIdFromParams]);

  const syncMessagesSilently = useCallback(async () => {
    try {
      const response = await getChatMessages({ relationId, limit: 50 });
      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      mergeMessages(response.messages);
      await markChatAsRead(response.relationId);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404 && !relationIdFromParams) {
        setMessages([]);
        setParticipant(null);
        setRelationId(undefined);
      }

      // Fallback silencioso para no romper la UX del chat.
    }
  }, [mergeMessages, relationId, relationIdFromParams]);

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
            const nextMessage = payload.new as ChatMessage;
            appendMessage(nextMessage);

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
  }, [appendMessage, myUserId, relationId]);

  async function handleSend() {
    if (!messageText.trim() || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await sendChatMessage({
        content: messageText,
        relationId
      });

      setRelationId(response.relationId);
      appendMessage(response.message);
      setMessageText('');
    } catch (error) {
      Alert.alert('Chat', error instanceof Error ? error.message : 'No pudimos enviar el mensaje.');
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickMedia(mediaType: 'image' | 'video') {
    if (isSending) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Chat', 'Necesitamos permiso para acceder a tu galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: mediaType === 'image' ? ['images'] : ['videos'],
      quality: 0.8
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `${mediaType}-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
    const mimeType = asset.mimeType ?? (mediaType === 'image' ? 'image/jpeg' : 'video/mp4');

    setIsSending(true);

    try {
      const response = await sendChatMedia({
        relationId,
        file: {
          uri: asset.uri,
          name: fileName,
          type: mimeType
        }
      });

      setRelationId(response.relationId);
      appendMessage(response.message);
    } catch (error) {
      Alert.alert('Chat', error instanceof Error ? error.message : 'No pudimos enviar el archivo.');
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickDocument() {
    if (isSending) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: '*/*'
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.name ?? `archivo-${Date.now()}`;
    const mimeType = asset.mimeType ?? 'application/octet-stream';

    setIsSending(true);

    try {
      const response = await sendChatMedia({
        relationId,
        file: {
          uri: asset.uri,
          name: fileName,
          type: mimeType
        }
      });

      setRelationId(response.relationId);
      appendMessage(response.message);
    } catch (error) {
      Alert.alert('Chat', error instanceof Error ? error.message : 'No pudimos enviar el archivo.');
    } finally {
      setIsSending(false);
    }
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
      Alert.alert('Chat', error instanceof Error ? error.message : 'No pudimos iniciar la videollamada.');
    } finally {
      setIsSending(false);
    }
  }

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  const chatItems = useMemo(() => {
    const items: (
      | { type: 'date'; id: string; label: string }
      | { type: 'message'; id: string; message: ChatMessage }
    )[] = [];

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
      <Text style={styles.title}>Consultas</Text>
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
        contentContainerStyle={styles.list}
        data={chatItems}
        keyExtractor={(item) => item.id}
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

          return (
            <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
              {parsed.kind === 'text' ? (
                <Text style={[styles.bubbleText, isMine ? styles.mineText : styles.theirsText]}>{parsed.text}</Text>
              ) : null}

              {parsed.kind === 'image' && parsed.url ? (
                <Pressable onPress={() => void Linking.openURL(parsed.url)} style={styles.attachmentCard}>
                  <View style={styles.attachmentHeaderRow}>
                    <Ionicons color={isMine ? colors.surface : colors.primaryDark} name="image-outline" size={16} />
                    <Text style={[styles.attachmentTypeLabel, isMine ? styles.mineText : styles.theirsText]}>Imagen</Text>
                  </View>
                  <Image source={{ uri: parsed.url }} style={styles.mediaPreview} />
                  <Text style={[styles.mediaCaption, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
                    Toca para abrir
                  </Text>
                </Pressable>
              ) : null}

              {parsed.kind === 'video' && parsed.url ? (
                <Pressable onPress={() => void Linking.openURL(parsed.url)} style={styles.attachmentCard}>
                  <View style={styles.attachmentHeaderRow}>
                    <Ionicons color={isMine ? colors.surface : colors.primaryDark} name="film-outline" size={16} />
                    <Text style={[styles.attachmentTypeLabel, isMine ? styles.mineText : styles.theirsText]}>Video</Text>
                  </View>
                  <View style={[styles.filePreviewBox, isMine ? styles.filePreviewMine : styles.filePreviewTheirs]}>
                    <Ionicons color={isMine ? colors.surface : colors.primaryDark} name="play-circle-outline" size={28} />
                    <Text style={[styles.filePreviewTitle, isMine ? styles.mineText : styles.theirsText]} numberOfLines={1}>
                      {parsed.fileName ?? 'Video adjunto'}
                    </Text>
                    <Text style={[styles.filePreviewHint, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
                      Toca para reproducir
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {parsed.kind === 'file' && parsed.url ? (
                <Pressable onPress={() => void openFilePreview(parsed.url, parsed.mimeType)} style={styles.attachmentCard}>
                  <View style={styles.attachmentHeaderRow}>
                    <Ionicons color={isMine ? colors.surface : colors.primaryDark} name="document-attach-outline" size={16} />
                    <Text style={[styles.attachmentTypeLabel, isMine ? styles.mineText : styles.theirsText]}>Archivo</Text>
                  </View>
                  <View style={[styles.filePreviewBox, isMine ? styles.filePreviewMine : styles.filePreviewTheirs]}>
                    <Text style={[styles.filePreviewTitle, isMine ? styles.mineText : styles.theirsText]} numberOfLines={1}>
                      {parsed.fileName ?? 'Archivo adjunto'}
                    </Text>
                    <Text style={[styles.filePreviewHint, isMine ? styles.mineTextSoft : styles.theirsTextSoft]} numberOfLines={1}>
                      {getFileHint(parsed.mimeType)}
                    </Text>
                  </View>
                </Pressable>
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

                  <Button onPress={() => void Linking.openURL(parsed.url)} variant={isMine ? 'secondary' : 'primary'}>
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
        <View style={styles.composerRow}>
          <View style={styles.quickActionsRow}>
            <Pressable
              accessibilityLabel="Enviar imagen"
              accessibilityRole="button"
              disabled={isSending}
              onPress={() => void handlePickMedia('image')}
              style={({ pressed }) => [styles.iconActionButton, pressed && styles.iconActionPressed, isSending && styles.iconActionDisabled]}
            >
              <Ionicons color={colors.primaryDark} name="image-outline" size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Enviar archivo de video"
              accessibilityRole="button"
              disabled={isSending}
              onPress={() => void handlePickMedia('video')}
              style={({ pressed }) => [styles.iconActionButton, pressed && styles.iconActionPressed, isSending && styles.iconActionDisabled]}
            >
              <Ionicons color={colors.primaryDark} name="film-outline" size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Enviar archivo"
              accessibilityRole="button"
              disabled={isSending}
              onPress={() => void handlePickDocument()}
              style={({ pressed }) => [styles.iconActionButton, pressed && styles.iconActionPressed, isSending && styles.iconActionDisabled]}
            >
              <Ionicons color={colors.primaryDark} name="document-attach-outline" size={20} />
            </Pressable>
          </View>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Escribi tu mensaje"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <Button onPress={handleSend} disabled={isSending || !messageText.trim()}>
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
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10
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
    flexDirection: 'column',
    gap: 8
  },
  quickActionsRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 8
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
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
    minHeight: 44,
    paddingHorizontal: 12
  },
  mediaPreview: {
    borderRadius: 10,
    height: 180,
    width: 180
  },
  attachmentCard: {
    gap: 8,
    minWidth: 180
  },
  attachmentHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  attachmentTypeLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  mediaCaption: {
    fontSize: 12,
    marginTop: 6
  },
  filePreviewBox: {
    borderRadius: 10,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  filePreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  filePreviewTheirs: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  filePreviewTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  filePreviewHint: {
    fontSize: 12
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

async function openFilePreview(url: string, mimeType?: string): Promise<void> {
  const previewUrl = buildFilePreviewUrl(url, mimeType);

  const canOpenPreview = await Linking.canOpenURL(previewUrl);

  if (canOpenPreview) {
    await Linking.openURL(previewUrl);
    return;
  }

  await Linking.openURL(url);
}

function buildFilePreviewUrl(url: string, mimeType?: string): string {
  if (isOfficeDocument(mimeType)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}

function isOfficeDocument(mimeType?: string): boolean {
  if (!mimeType) {
    return false;
  }

  return (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
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

function getFileHint(mimeType?: string): string {
  if (!mimeType) {
    return 'Toca para previsualizar';
  }

  if (mimeType.startsWith('application/pdf')) {
    return 'Documento PDF';
  }

  if (mimeType.includes('word')) {
    return 'Documento Word';
  }

  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return 'Planilla';
  }

  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'Presentacion';
  }

  return 'Toca para previsualizar';
}
