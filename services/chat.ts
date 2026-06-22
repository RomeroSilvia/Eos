import { apiRequest } from '@/services/api/client';
import { Platform } from 'react-native';

export const MAX_CHAT_IMAGE_SIZE_MB = 15;
export const MAX_CHAT_IMAGE_SIZE_BYTES = MAX_CHAT_IMAGE_SIZE_MB * 1024 * 1024;
const IMAGE_MESSAGE_EMPTY_CONTENT = '__eos_chat_image__';

export type ChatMessageKind = 'text' | 'image' | 'call_invite' | 'call_ended';

export type ChatParsedPayload = {
  kind: ChatMessageKind;
  text?: string;
  url?: string;
  title?: string;
};

export type ChatMessage = {
  id: string;
  relation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image';
  mediaUrl?: string | null;
  mediaAvailable?: boolean;
  media_mime_type?: string | null;
  media_size?: number | null;
  read_at: string | null;
  created_at: string;
};

type RawChatMessage = Partial<ChatMessage> & {
  relationId?: string;
  senderId?: string;
  messageType?: 'text' | 'image';
  media_url?: string | null;
  mediaUrl?: string | null;
  mediaAvailable?: boolean;
  media_mime_type?: string | null;
  mediaMimeType?: string | null;
  media_size?: number | null;
  mediaSize?: number | null;
  readAt?: string | null;
  createdAt?: string;
};

export type ChatParticipant = {
  id: string;
  fullName: string | null;
  email: string | null;
};

type ChatMessagesResponse = {
  relationId: string;
  participant?: ChatParticipant | null;
  messages: ChatMessage[];
};

type RawChatParticipant = Partial<ChatParticipant> & {
  full_name?: string | null;
  fullName?: string | null;
};

type RawChatMessagesResponse = {
  relationId?: string;
  relation_id?: string;
  participant?: RawChatParticipant | null;
  messages?: RawChatMessage[];
};

type ChatSendResponse = {
  relationId: string;
  message: ChatMessage;
};

type RawChatSendResponse = {
  relationId?: string;
  relation_id?: string;
  message?: RawChatMessage;
};

type ChatVideoCallResponse = ChatSendResponse & {
  callUrl: string;
};

export async function getChatMessages(params: {
  relationId?: string;
  limit?: number;
  before?: string;
} = {}): Promise<ChatMessagesResponse> {
  const query = new URLSearchParams();

  if (params.relationId) query.set('relationId', params.relationId);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.before) query.set('before', params.before);

  const queryString = query.toString();
  const path = queryString ? `/chat/messages?${queryString}` : '/chat/messages';

  const response = await apiRequest<RawChatMessagesResponse>({ path, method: 'GET' });
  return normalizeChatMessagesResponse(response);
}

export async function getChatMessageById(params: {
  messageId: string;
  relationId?: string;
}): Promise<ChatSendResponse> {
  const query = new URLSearchParams();

  if (params.relationId) {
    query.set('relationId', params.relationId);
  }

  const queryString = query.toString();
  const path = queryString
    ? `/chat/messages/${encodeURIComponent(params.messageId)}?${queryString}`
    : `/chat/messages/${encodeURIComponent(params.messageId)}`;

  const response = await apiRequest<RawChatSendResponse>({
    path,
    method: 'GET'
  });

  return normalizeChatSendResponse(response);
}

export async function sendChatMessage(payload: {
  content: string;
  relationId?: string;
}): Promise<ChatSendResponse> {
  const response = await apiRequest<RawChatSendResponse>({
    path: '/chat/messages',
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return normalizeChatSendResponse(response);
}

export async function sendChatImage(payload: {
  file: { uri: string; name: string; type: string };
  content?: string;
  relationId?: string;
}): Promise<ChatSendResponse> {
  const formData = new FormData();

  if (payload.relationId) {
    formData.append('relationId', payload.relationId);
  }

  if (payload.content?.trim()) {
    formData.append('content', payload.content.trim());
  }

  await appendImageFile(formData, payload.file);

  const response = await apiRequest<RawChatSendResponse>({
    path: '/chat/messages',
    method: 'POST',
    body: formData
  });

  return normalizeChatSendResponse(response);
}

export async function markChatAsRead(relationId?: string): Promise<void> {
  await apiRequest({
    path: '/chat/messages/read',
    method: 'PATCH',
    body: JSON.stringify({ relationId })
  });
}

export async function startChatVideoCall(payload: {
  relationId?: string;
} = {}): Promise<ChatVideoCallResponse> {
  return apiRequest<ChatVideoCallResponse>({
    path: '/chat/video-call',
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function parseChatMessage(message: ChatMessage): ChatParsedPayload {
  if (message.message_type === 'image' || Boolean(message.mediaUrl)) {
    return {
      kind: 'image',
      text: getImageMessageText(message.content),
      url: message.mediaUrl ?? undefined
    };
  }

  try {
    const parsed = JSON.parse(message.content) as {
      kind?: unknown;
      url?: unknown;
      title?: unknown;
    };

    if (parsed.kind === 'image' || parsed.kind === 'call_invite' || parsed.kind === 'call_ended') {
      if (parsed.kind === 'image') {
        const parsedUrl = typeof parsed.url === 'string' ? parsed.url : undefined;

        return {
          kind: 'image',
          text: getImageMessageText(message.content),
          url: message.mediaUrl ?? parsedUrl
        };
      }

      return {
        kind: parsed.kind,
        url: typeof parsed.url === 'string' ? parsed.url : undefined,
        title: typeof parsed.title === 'string' ? parsed.title : undefined
      };
    }

    if (parsed.kind === 'video' || parsed.kind === 'file') {
      return {
        kind: 'text',
        text: 'Adjunto no disponible en esta version.'
      };
    }
  } catch {
    // Mensaje de texto plano legacy
  }

  return {
    kind: 'text',
    text: message.content
  };
}

export function normalizeChatMessage(message: RawChatMessage): ChatMessage {
  const createdAt = toStringValue(message.created_at ?? message.createdAt);
  const relationId = toStringValue(message.relation_id ?? message.relationId);
  const senderId = toStringValue(message.sender_id ?? message.senderId);
  const content = toStringValue(message.content);
  const id = toStringValue(message.id) || `${relationId}:${senderId}:${createdAt}:${content.slice(0, 24)}`;

  return {
    id,
    relation_id: relationId,
    sender_id: senderId,
    content,
    message_type: normalizeMessageType(message.message_type ?? message.messageType, message.media_url ?? message.mediaUrl),
    mediaUrl: normalizeNullableString(message.mediaUrl ?? message.media_url),
    mediaAvailable: typeof message.mediaAvailable === 'boolean' ? message.mediaAvailable : undefined,
    media_mime_type: normalizeNullableString(message.media_mime_type ?? message.mediaMimeType),
    media_size: normalizeNullableNumber(message.media_size ?? message.mediaSize),
    read_at: normalizeNullableString(message.read_at ?? message.readAt),
    created_at: createdAt
  };
}

function normalizeChatMessagesResponse(response: RawChatMessagesResponse): ChatMessagesResponse {
  return {
    relationId: toStringValue(response.relationId ?? response.relation_id),
    participant: normalizeParticipant(response.participant),
    messages: (response.messages ?? []).map(normalizeChatMessage)
  };
}

function normalizeChatSendResponse(response: RawChatSendResponse): ChatSendResponse {
  return {
    relationId: toStringValue(response.relationId ?? response.relation_id),
    message: normalizeChatMessage(response.message ?? {})
  };
}

function normalizeParticipant(participant?: RawChatParticipant | null): ChatParticipant | null {
  if (!participant?.id) {
    return null;
  }

  return {
    id: participant.id,
    fullName: normalizeNullableString(participant.fullName ?? participant.full_name),
    email: normalizeNullableString(participant.email)
  };
}

function normalizeMessageType(type: unknown, mediaUrl: unknown): 'text' | 'image' | undefined {
  if (type === 'text' || type === 'image') {
    return type;
  }

  if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
    return 'image';
  }

  return 'text';
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function getImageMessageText(content: string): string | undefined {
  if (!content || content === IMAGE_MESSAGE_EMPTY_CONTENT) {
    return undefined;
  }

  return content;
}

async function appendImageFile(
  formData: FormData,
  file: { uri: string; name: string; type: string }
): Promise<void> {
  const normalizedType = normalizeImageMimeType(file.type);

  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const type = normalizeImageMimeType(blob.type) || normalizedType;
    const imageFile = new File([blob], file.name, { type });
    formData.append('image', imageFile);
    return;
  }

  formData.append('image', { ...file, type: normalizedType } as unknown as Blob);
}

function normalizeImageMimeType(mimeType?: string | null): string {
  if (mimeType === 'image/jpg') {
    return 'image/jpeg';
  }

  return mimeType || 'image/jpeg';
}
