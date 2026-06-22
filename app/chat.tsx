import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  AppState,
  Alert,
  FlatList,
  Image,
  type LayoutChangeEvent,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { ChatImage } from '@/components/chat/ChatImage';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';
import { ApiClientError, getFriendlyErrorMessage } from '@/services/api/client';
import { getCurrentProfile } from '@/services/auth';
import {
  getChatMessageById,
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
const NEAR_CHAT_END_THRESHOLD = 120;
const INITIAL_SCROLL_TO_END_WINDOW_MS = 900;

type SelectedChatImage = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

type ChatListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: ChatMessage };

type OutgoingStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

type RetryPayload = {
  relationId?: string;
  content: string;
  image?: SelectedChatImage | null;
};

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
  const [messageStatusById, setMessageStatusById] = useState<Record<string, OutgoingStatus>>({});
  const [localImageUrisById, setLocalImageUrisById] = useState<Record<string, string>>({});
  const [relationId, setRelationId] = useState<string | undefined>(relationIdFromParams);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isRealtimeSubscribed, setIsRealtimeSubscribed] = useState(false);
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const shouldScrollToEndRef = useRef(false);
  const isNearEndRef = useRef(true);
  const scrollToEndUntilRef = useRef(0);
  const pendingCallEndRef = useRef<{ relationId?: string; startedAt: string } | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const myUserIdRef = useRef<string | null>(null);
  const lastMarkAsReadAtRef = useRef(0);
  const markAsReadInFlightRef = useRef(false);
  const messageSyncVersionRef = useRef(0);
  const didInitialLoadByRelationRef = useRef<Record<string, true>>({});
  const refreshedMessageIdsRef = useRef<Set<string>>(new Set());
  const retryPayloadByLocalIdRef = useRef<Record<string, RetryPayload>>({});
  const sentToDeliveredTimerByIdRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const hasScrolledInitiallyRef = useRef(false);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const diagnosticsRef = useRef({
    loadMessages: 0,
    markAsRead: 0,
    realtimeSubscriptions: 0,
    refreshSingleMessage: 0,
    messageBubbleRender: 0
  });

  const scrollToLatestMessage = useCallback((animated = true, attempts = 1) => {
    const runScroll = (remainingAttempts: number) => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated });

        if (remainingAttempts > 1) {
          setTimeout(() => runScroll(remainingAttempts - 1), 80);
        }
      });
    };

    runScroll(attempts);
  }, []);

  useEffect(() => {
    messageSyncVersionRef.current += 1;
    setRelationId(relationIdFromParams);
    setMessages([]);
    setMessageStatusById({});
    setParticipant(null);
    setLocalImageUrisById({});
    isNearEndRef.current = true;
    hasScrolledInitiallyRef.current = false;
    shouldScrollToEndRef.current = false;
    scrollToEndUntilRef.current = 0;
    refreshedMessageIdsRef.current.clear();
    retryPayloadByLocalIdRef.current = {};
    previousLastMessageIdRef.current = null;

    for (const timer of Object.values(sentToDeliveredTimerByIdRef.current)) {
      clearTimeout(timer);
    }

    sentToDeliveredTimerByIdRef.current = {};
  }, [relationIdFromParams]);

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((prev) => {
      return mergeChatMessages(prev, [nextMessage]);
    });

    if (nextMessage.sender_id === myUserIdRef.current) {
      setMessageStatusById((prev) => {
        const nextStatus: OutgoingStatus = nextMessage.read_at ? 'read' : 'delivered';

        if (prev[nextMessage.id] === nextStatus) {
          return prev;
        }

        return {
          ...prev,
          [nextMessage.id]: nextStatus
        };
      });
    }
  }, []);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => mergeChatMessages(prev, incoming));

    const incomingOwn = incoming.filter((message) => message.sender_id === myUserIdRef.current);

    if (incomingOwn.length > 0) {
      setMessageStatusById((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const message of incomingOwn) {
          const nextStatus: OutgoingStatus = message.read_at ? 'read' : 'delivered';

          if (next[message.id] !== nextStatus) {
            next[message.id] = nextStatus;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const profile = await getCurrentProfile();
        myUserIdRef.current = profile.id;
        setMyUserId(profile.id);
        setMyRole(profile.role ?? null);
      } catch {
        myUserIdRef.current = null;
        setMyUserId(null);
        setMyRole(null);
      }
    })();
  }, []);

  const markChatAsReadInBackground = useCallback((nextRelationId?: string, candidateMessages?: ChatMessage[]) => {
    if (!nextRelationId || !myUserIdRef.current || !candidateMessages?.length) {
      return;
    }

    const hasUnreadIncoming = candidateMessages.some(
      (message) => message.sender_id !== myUserIdRef.current && message.read_at === null
    );

    if (!hasUnreadIncoming) {
      return;
    }

    const now = Date.now();

    if (markAsReadInFlightRef.current || now - lastMarkAsReadAtRef.current < 1500) {
      return;
    }

    lastMarkAsReadAtRef.current = now;
    markAsReadInFlightRef.current = true;

    if (__DEV__) {
      diagnosticsRef.current.markAsRead += 1;
      console.log('[chat:diagnostic] markAsRead', diagnosticsRef.current.markAsRead, nextRelationId);
    }

    void markChatAsRead(nextRelationId)
      .catch(() => undefined)
      .finally(() => {
        markAsReadInFlightRef.current = false;
      });
  }, []);

  const loadMessages = useCallback(async (nextRelationId?: string) => {
    const syncVersion = messageSyncVersionRef.current;
    setIsLoading(true);

    if (__DEV__) {
      diagnosticsRef.current.loadMessages += 1;
      console.log('[chat:diagnostic] loadMessages', diagnosticsRef.current.loadMessages, nextRelationId ?? relationIdFromParams ?? 'auto');
    }

    try {
      const response = await getChatMessages({ relationId: nextRelationId, limit: 50 });

      if (syncVersion !== messageSyncVersionRef.current) {
        return;
      }

      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      mergeMessages(response.messages);
      if (response.messages.length > 0) {
        shouldScrollToEndRef.current = true;
        scrollToEndUntilRef.current = Date.now() + INITIAL_SCROLL_TO_END_WINDOW_MS;
        isNearEndRef.current = true;
        scrollToLatestMessage(false, 4);
      }
      markChatAsReadInBackground(response.relationId, response.messages);
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
  }, [markChatAsReadInBackground, relationIdFromParams, mergeMessages, scrollToLatestMessage]);

  const syncMessagesSilently = useCallback(async (nextRelationId = relationId) => {
    const syncVersion = messageSyncVersionRef.current;

    try {
      const response = await getChatMessages({ relationId: nextRelationId, limit: 50 });

      if (syncVersion !== messageSyncVersionRef.current) {
        return;
      }

      setRelationId(response.relationId);
      setParticipant(response.participant ?? null);
      mergeMessages(response.messages);
      markChatAsReadInBackground(response.relationId, response.messages);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404 && !relationIdFromParams) {
        setMessages([]);
        setParticipant(null);
        setRelationId(undefined);
      }

      // Fallback silencioso para no romper la UX del chat.
    }
  }, [markChatAsReadInBackground, relationId, relationIdFromParams, mergeMessages]);

  const refreshSingleMessageSilently = useCallback(async (messageId: string, nextRelationId = relationId) => {
    const syncVersion = messageSyncVersionRef.current;

    try {
      const response = await getChatMessageById({
        messageId,
        relationId: nextRelationId
      });

      if (syncVersion !== messageSyncVersionRef.current) {
        return;
      }

      setRelationId(response.relationId);
      mergeMessages([response.message]);
      markChatAsReadInBackground(response.relationId, [response.message]);
    } catch {
      // Fallback silencioso para no romper la UX del chat.
    }
  }, [markChatAsReadInBackground, mergeMessages, relationId]);

  useEffect(() => {
    const initialKey = relationIdFromParams ?? '__auto_relation__';

    if (didInitialLoadByRelationRef.current[initialKey]) {
      return;
    }

    didInitialLoadByRelationRef.current[initialKey] = true;
    void loadMessages(relationIdFromParams);
  }, [loadMessages, relationIdFromParams]);

  useFocusEffect(
    useCallback(() => {
      let delayedIntervalStart: ReturnType<typeof setTimeout> | null = null;
      const intervalId = !isRealtimeSubscribed
        ? null
        : null;

      let pollingIntervalId: ReturnType<typeof setInterval> | null = intervalId;

      if (!isRealtimeSubscribed) {
        delayedIntervalStart = setTimeout(() => {
          pollingIntervalId = setInterval(() => {
            void syncMessagesSilently();
          }, 3000);
        }, 4000);
      }

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
        if (delayedIntervalStart) {
          clearTimeout(delayedIntervalStart);
        }

        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
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

    if (__DEV__) {
      diagnosticsRef.current.realtimeSubscriptions += 1;
      console.log('[chat:diagnostic] realtimeSubscription', diagnosticsRef.current.realtimeSubscriptions, relationId);
    }

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
            const parsedPayload = parseChatMessage(nextMessage);
            const shouldKeepAtEnd = isNearEndRef.current;

            if (shouldKeepAtEnd) {
              shouldScrollToEndRef.current = true;
            }

            appendMessage(nextMessage);

            if (shouldKeepAtEnd) {
              scrollToLatestMessage(true);
            }

            if (parsedPayload.kind === 'image' && !parsedPayload.url) {
              if (!refreshedMessageIdsRef.current.has(nextMessage.id)) {
                refreshedMessageIdsRef.current.add(nextMessage.id);

                if (__DEV__) {
                  diagnosticsRef.current.refreshSingleMessage += 1;
                  console.log('[chat:diagnostic] refreshSingleMessage', diagnosticsRef.current.refreshSingleMessage, nextMessage.id);
                }

                void refreshSingleMessageSilently(nextMessage.id, relationId);
              }
            }

            if (nextMessage.sender_id !== myUserIdRef.current) {
              markChatAsReadInBackground(relationId, [nextMessage]);
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
  }, [appendMessage, markChatAsReadInBackground, refreshSingleMessageSilently, relationId, scrollToLatestMessage]);

  async function handleSend() {
    if ((!messageText.trim() && !selectedImage) || isSending) {
      return;
    }

    const trimmedContent = messageText.trim();
    const isImageMessage = Boolean(selectedImage);
    const imageToSend = selectedImage;
    const optimisticMessage = buildOptimisticMessage({
      relationId,
      senderId: myUserIdRef.current,
      content: trimmedContent,
      image: imageToSend
    });

    appendMessage(optimisticMessage);
    setMessageStatusById((prev) => ({
      ...prev,
      [optimisticMessage.id]: 'sending'
    }));

    retryPayloadByLocalIdRef.current[optimisticMessage.id] = {
      relationId,
      content: trimmedContent,
      image: imageToSend
    };

    if (imageToSend) {
      setLocalImageUrisById((prev) => ({
        ...prev,
        [optimisticMessage.id]: imageToSend.uri
      }));
    }

    setMessageText('');
    setSelectedImage(null);
    shouldScrollToEndRef.current = true;
    setIsSending(true);

    try {
      const response = isImageMessage && imageToSend
        ? await sendChatImage({
          relationId,
          content: trimmedContent,
          file: {
            uri: imageToSend.uri,
            name: imageToSend.name,
            type: imageToSend.type
          }
        })
        : await sendChatMessage({
          content: trimmedContent,
          relationId
        });

      setRelationId(response.relationId);
      setMessages((prev) => replaceMessageById(prev, optimisticMessage.id, response.message));

      setMessageStatusById((prev) => {
        const next = { ...prev };
        delete next[optimisticMessage.id];
        next[response.message.id] = 'sent';
        return next;
      });

      delete retryPayloadByLocalIdRef.current[optimisticMessage.id];

      if (sentToDeliveredTimerByIdRef.current[response.message.id]) {
        clearTimeout(sentToDeliveredTimerByIdRef.current[response.message.id]);
      }

      sentToDeliveredTimerByIdRef.current[response.message.id] = setTimeout(() => {
        setMessageStatusById((prev) => {
          if (prev[response.message.id] !== 'sent') {
            return prev;
          }

          return {
            ...prev,
            [response.message.id]: 'delivered'
          };
        });
      }, 900);

      if (isImageMessage && imageToSend) {
        setLocalImageUrisById((prev) => remapLocalImageUri(prev, optimisticMessage.id, response.message.id, imageToSend.uri));
      }

      if (isImageMessage && !response.message.mediaUrl) {
        await refreshSingleMessageSilently(response.message.id, response.relationId);
      }
    } catch (error) {
      setMessageStatusById((prev) => ({
        ...prev,
        [optimisticMessage.id]: 'error'
      }));
      Alert.alert('Chat', getFriendlyErrorMessage(error, 'No pudimos enviar el mensaje.'));
    } finally {
      setIsSending(false);
    }
  }

  const handleRetry = useCallback(async (messageId: string) => {
    const payload = retryPayloadByLocalIdRef.current[messageId];

    if (!payload || isSending) {
      return;
    }

    setMessageStatusById((prev) => ({
      ...prev,
      [messageId]: 'sending'
    }));

    setIsSending(true);

    try {
      const response = payload.image
        ? await sendChatImage({
          relationId: payload.relationId,
          content: payload.content,
          file: {
            uri: payload.image.uri,
            name: payload.image.name,
            type: payload.image.type
          }
        })
        : await sendChatMessage({
          relationId: payload.relationId,
          content: payload.content
        });

      setRelationId(response.relationId);
      setMessages((prev) => replaceMessageById(prev, messageId, response.message));

      delete retryPayloadByLocalIdRef.current[messageId];

      setMessageStatusById((prev) => {
        const next = { ...prev };
        delete next[messageId];
        next[response.message.id] = 'sent';
        return next;
      });

      if (payload.image) {
        setLocalImageUrisById((prev) => remapLocalImageUri(prev, messageId, response.message.id, payload.image?.uri));
      }
    } catch {
      setMessageStatusById((prev) => ({
        ...prev,
        [messageId]: 'error'
      }));
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

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

  const lastMessage = orderedMessages.length > 0 ? orderedMessages[orderedMessages.length - 1] : null;
  const lastMessageId = lastMessage?.id ?? null;
  const lastMessageSenderId = lastMessage?.sender_id ?? null;

  useEffect(() => {
    if (!lastMessageId) {
      previousLastMessageIdRef.current = null;
      return;
    }

    const previous = previousLastMessageIdRef.current;
    previousLastMessageIdRef.current = lastMessageId;

    if (!previous || previous === lastMessageId) {
      return;
    }

    const isOwnMessage = lastMessageSenderId === myUserIdRef.current;

    if (isOwnMessage || isNearEndRef.current) {
      scrollToLatestMessage(true, 2);
    }
  }, [lastMessageId, lastMessageSenderId, scrollToLatestMessage]);

  useEffect(() => {
    if (isLoading || chatItems.length === 0 || hasScrolledInitiallyRef.current) {
      return;
    }

    hasScrolledInitiallyRef.current = true;
    scrollToLatestMessage(false, 5);
  }, [chatItems.length, isLoading, scrollToLatestMessage]);

  const chatListExtraData = useMemo(
    () => ({ localImageUrisById, myRole, myUserId, messageStatusById }),
    [localImageUrisById, messageStatusById, myRole, myUserId]
  );

  const handleContentSizeChange = useCallback(() => {
    if (!shouldScrollToEndRef.current && Date.now() > scrollToEndUntilRef.current) {
      return;
    }

    if (Date.now() > scrollToEndUntilRef.current) {
      shouldScrollToEndRef.current = false;
    }

    if (shouldScrollToEndRef.current) {
      shouldScrollToEndRef.current = false;
    }

    scrollToLatestMessage(true, 2);
  }, [scrollToLatestMessage]);

  const handleListLayout = useCallback((_event: LayoutChangeEvent) => {
    if (shouldScrollToEndRef.current || Date.now() <= scrollToEndUntilRef.current) {
      scrollToLatestMessage(false, 3);
    }
  }, [scrollToLatestMessage]);

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    isNearEndRef.current = distanceFromEnd <= NEAR_CHAT_END_THRESHOLD;
  }, []);

  const renderChatItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'date') {
      return <ChatDateSeparator label={item.label} />;
    }

    const message = item.message;
    const isMine = myUserId === message.sender_id;
    const localImageUri = localImageUrisById[message.id];
    const parsed = parseChatMessage(message);
    const imageUri = message.mediaUrl ?? parsed.url ?? localImageUri;
    const messageStatus = isMine ? resolveOutgoingStatus(message, messageStatusById[message.id]) : null;

    return (
      <ChatMessageBubble
        imageUri={imageUri}
        mediaPath={message.mediaPath ?? null}
        relationId={message.relation_id}
        role={myRole}
        isMine={isMine}
        messageStatus={messageStatus}
        onRetryMessage={handleRetry}
        message={message}
        parsed={parsed}
      />
    );
  }, [handleRetry, localImageUrisById, messageStatusById, myRole, myUserId]);

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
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Todavía no hay mensajes</Text>
          </View>
        ) : null}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleListLayout}
        onScroll={handleListScroll}
        renderItem={renderChatItem}
        scrollEventThrottle={80}
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

const SimpleMessageStatusIndicator = memo(function SimpleMessageStatusIndicator({
  status,
  onRetry
}: {
  status: OutgoingStatus;
  onRetry?: () => void;
}) {
  if (status === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.errorStatusWrap, pressed && styles.iconActionPressed]}
      >
        <Ionicons color={colors.secondaryLight} name="alert-circle-outline" size={13} />
        <Text style={styles.errorStatusText}>No enviado</Text>
      </Pressable>
    );
  }

  if (status === 'sending') {
    return (
      <View style={styles.messageStatusWrap}>
        <Ionicons color={colors.textSecondaryLight} name="time-outline" size={13} />
      </View>
    );
  }

  if (status === 'sent') {
    return (
      <View style={styles.messageStatusWrap}>
        <Ionicons color={colors.textSecondaryLight} name="checkmark" size={13} />
      </View>
    );
  }

  return (
    <View style={styles.messageStatusWrap}>
      <Ionicons
        color={status === 'read' ? colors.success : colors.textSecondaryLight}
        name="checkmark-done"
        size={13}
      />
    </View>
  );
});

type ChatMessageBubbleProps = {
  imageUri?: string;
  mediaPath?: string | null;
  relationId?: string;
  role?: string | null;
  isMine: boolean;
  messageStatus?: OutgoingStatus | null;
  onRetryMessage?: (messageId: string) => void;
  message: ChatMessage;
  parsed: ChatParsedPayload;
};

const ChatMessageBubble = memo(function ChatMessageBubble({
  imageUri,
  mediaPath,
  relationId,
  role,
  isMine,
  messageStatus,
  onRetryMessage,
  message,
  parsed
}: ChatMessageBubbleProps) {
  const renderCountRef = useRef(0);

  renderCountRef.current += 1;

  if (__DEV__ && renderCountRef.current <= 5) {
    console.log('[chat:diagnostic] MessageBubble render', message.id, renderCountRef.current);
  }

  const visualStatus = isMine
    ? (message.read_at ? 'read' : (messageStatus ?? 'delivered'))
    : null;

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
          <ChatImage
            messageId={message.id}
            mediaPath={mediaPath ?? null}
            mediaUrl={imageUri ?? null}
            relationId={relationId}
            role={role}
          />
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

      <View style={styles.messageMetaRow}>
        <Text style={[styles.messageTime, isMine ? styles.mineTextSoft : styles.theirsTextSoft]}>
          {formatMessageTime(message.created_at)}
        </Text>
        {isMine && visualStatus ? (
          <SimpleMessageStatusIndicator
            status={visualStatus}
            onRetry={visualStatus === 'error' ? () => onRetryMessage?.(message.id) : undefined}
          />
        ) : null}
      </View>
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
    elevation: 8,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    overflow: 'visible',
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    zIndex: 30
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
  chatMenuWrap: {
    elevation: 20,
    position: 'relative',
    zIndex: 60
  },
  chatMenuButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  chatMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 28,
    minWidth: 136,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
    top: 40,
    zIndex: 1000
  },
  chatMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  chatMenuItemText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  list: {
    flexGrow: 1,
    gap: 8,
    paddingBottom: 12,
    zIndex: 1
  },
  emptyChat: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 36
  },
  emptyChatText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
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
  messageMetaRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6
  },
  messageStatusWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3
  },
  errorStatusWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  errorStatusText: {
    color: colors.secondaryLight,
    fontSize: 10,
    fontWeight: '700'
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
  chatImageWrap: {
    borderRadius: 10,
    height: 180,
    overflow: 'hidden',
    width: 220
  },
  chatImageLoadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    gap: 6,
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject
  },
  chatImageLoadingText: {
    fontSize: 12,
    fontWeight: '700'
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

function buildOptimisticMessage(input: {
  relationId?: string;
  senderId: string | null;
  content: string;
  image?: SelectedChatImage | null;
}): ChatMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    relation_id: input.relationId ?? '',
    sender_id: input.senderId ?? 'me',
    content: input.content,
    message_type: input.image ? 'image' : 'text',
    mediaPath: null,
    mediaUrl: input.image?.uri ?? null,
    mediaAvailable: input.image ? true : undefined,
    media_mime_type: input.image?.type ?? null,
    media_size: input.image?.size ?? null,
    read_at: null,
    created_at: new Date().toISOString()
  };
}

function replaceMessageById(current: ChatMessage[], targetId: string, replacement: ChatMessage): ChatMessage[] {
  let changed = false;

  const next = current.map((message) => {
    if (message.id !== targetId) {
      return message;
    }

    changed = true;
    return replacement;
  });

  if (!changed) {
    return mergeChatMessages(current, [replacement]);
  }

  return mergeChatMessages(next, []);
}

function remapLocalImageUri(
  current: Record<string, string>,
  fromId: string,
  toId: string,
  fallbackUri?: string
): Record<string, string> {
  const uri = current[fromId] ?? fallbackUri;

  if (!uri) {
    return current;
  }

  const next = { ...current };
  delete next[fromId];
  next[toId] = uri;
  return next;
}

function resolveOutgoingStatus(message: ChatMessage, explicitStatus?: OutgoingStatus): OutgoingStatus {
  if (message.read_at) {
    return 'read';
  }

  if (explicitStatus) {
    return explicitStatus;
  }

  if (message.id.startsWith('local-')) {
    return 'sending';
  }

  return 'delivered';
}

function mergeChatMessages(
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[]
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
    const merged = mergeChatMessage(current, incoming);

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
  incoming: ChatMessage
): ChatMessage {
  const incomingMediaUrl = incoming.mediaUrl ?? null;
  const currentMediaUrl = current.mediaUrl ?? null;
  const mediaUrl = incomingMediaUrl || currentMediaUrl;

  const merged: ChatMessage = {
    ...current,
    ...incoming,
    content: incoming.content,
    message_type: incoming.message_type ?? current.message_type,
    mediaPath: incoming.mediaPath ?? current.mediaPath,
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
    current.mediaPath === next.mediaPath &&
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
    current.mediaPath === next.mediaPath &&
    current.relationId === next.relationId &&
    current.role === next.role &&
    current.parsed.kind === next.parsed.kind &&
    current.parsed.text === next.parsed.text &&
    current.parsed.url === next.parsed.url &&
    current.parsed.title === next.parsed.title &&
    current.imageUri === next.imageUri &&
    current.isMine === next.isMine &&
    current.messageStatus === next.messageStatus &&
    current.onRetryMessage === next.onRetryMessage
  );
}

