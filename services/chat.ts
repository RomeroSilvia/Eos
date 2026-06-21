import { apiRequest } from '@/services/api/client';

export const MAX_CHAT_IMAGE_SIZE_MB = 15;
export const MAX_CHAT_IMAGE_SIZE_BYTES = MAX_CHAT_IMAGE_SIZE_MB * 1024 * 1024;

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

type ChatSendResponse = {
  relationId: string;
  message: ChatMessage;
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

  return apiRequest<ChatMessagesResponse>({ path, method: 'GET' });
}

export async function sendChatMessage(payload: {
  content: string;
  relationId?: string;
}): Promise<ChatSendResponse> {
  return apiRequest<ChatSendResponse>({
    path: '/chat/messages',
    method: 'POST',
    body: JSON.stringify(payload)
  });
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

  formData.append('image', payload.file as unknown as Blob);

  return apiRequest<ChatSendResponse>({
    path: '/chat/messages',
    method: 'POST',
    body: formData
  });
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
  if (message.message_type === 'image') {
    return {
      kind: 'image',
      text: message.content || undefined,
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
        return {
          kind: 'image',
          text: message.content,
          url: message.mediaUrl ?? undefined
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
