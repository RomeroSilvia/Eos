import { apiRequest } from '@/services/api/client';

export type ChatMessageKind = 'text' | 'image' | 'video' | 'file' | 'call_invite' | 'call_ended';

export type ChatParsedPayload = {
  kind: ChatMessageKind;
  text?: string;
  url?: string;
  title?: string;
  mimeType?: string;
  fileName?: string | null;
};

export type ChatMessage = {
  id: string;
  relation_id: string;
  sender_id: string;
  content: string;
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

export async function markChatAsRead(relationId?: string): Promise<void> {
  await apiRequest({
    path: '/chat/messages/read',
    method: 'PATCH',
    body: JSON.stringify({ relationId })
  });
}

export async function sendChatMedia(payload: {
  file: { uri: string; name: string; type: string };
  relationId?: string;
}): Promise<ChatSendResponse> {
  const formData = new FormData();

  if (payload.relationId) {
    formData.append('relationId', payload.relationId);
  }

  formData.append('file', payload.file as any);

  return apiRequest<ChatSendResponse>({
    path: '/chat/media',
    method: 'POST',
    body: formData
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
  try {
    const parsed = JSON.parse(message.content) as Partial<ChatParsedPayload>;

    if (
      parsed.kind === 'image' ||
      parsed.kind === 'video' ||
      parsed.kind === 'file' ||
      parsed.kind === 'call_invite' ||
      parsed.kind === 'call_ended'
    ) {
      return {
        kind: parsed.kind,
        url: typeof parsed.url === 'string' ? parsed.url : undefined,
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        mimeType: typeof parsed.mimeType === 'string' ? parsed.mimeType : undefined,
        fileName: typeof parsed.fileName === 'string' ? parsed.fileName : null
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
