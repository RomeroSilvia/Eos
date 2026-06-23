import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { chatRepository } from './chat.repository';
import { notificationsService } from '../notifications/notifications.service';
import type { ChatMessageResponse, ChatMessageRow } from './chat.types';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  CHAT_MEDIA_BUCKET,
  CHAT_MEDIA_SIGNED_URL_EXPIRES_IN,
  MAX_CHAT_IMAGE_SIZE_BYTES,
  MAX_CHAT_IMAGE_SIZE_MB
} from './chat.constants';

type Role = 'user' | 'specialist' | 'center_admin';

type ResolveRelationInput = {
  userId: string;
  role: Role;
  relationId?: string;
};

export const chatService = {
  getHealth: () => ({
    module: 'chat',
    status: 'ready'
  }),

  getMessages: async (input: ResolveRelationInput & { limit?: number; before?: string }) => {
    const relation = await resolveRelation(input);
    const limit = normalizeLimit(input.limit);
    const participant = await resolveParticipant(relation, input.userId);

    const messages = await chatRepository.findMessages(relation.id, limit, input.before);
    const messagesWithMedia = await attachSignedMediaUrls(messages);

    return {
      relationId: relation.id,
      participant,
      messages: messagesWithMedia
    };
  },

  getMessageById: async (input: ResolveRelationInput & { messageId: string }) => {
    const relation = await resolveRelation(input);
    const message = await chatRepository.findMessageById(relation.id, input.messageId);

    if (!message) {
      throw new ApiError(404, 'Mensaje no encontrado.');
    }

    return {
      relationId: relation.id,
      message: await attachSignedMediaUrl(message)
    };
  },

  sendMessage: async (input: ResolveRelationInput & { content: string }) => {
    const relation = await resolveRelation(input);
    const content = normalizeContent(input.content);

    const message = await chatRepository.createMessage({
      relation_id: relation.id,
      sender_id: input.userId,
      content,
      message_type: 'text',
      media_path: null,
      media_mime_type: null,
      media_size: null
    });

    notifyRecipientInBackground(relation, input.userId, 'Nuevo mensaje', 'Tenes un nuevo mensaje en el chat.');

    return {
      relationId: relation.id,
      message: sanitizeMessage(message)
    };
  },

  startVideoCall: async (input: ResolveRelationInput) => {
    const relation = await resolveRelation(input);
    const roomName = buildCallRoomName(relation.id);
    const callUrl = buildVideoCallUrl(roomName);

    const message = await chatRepository.createMessage({
      relation_id: relation.id,
      sender_id: input.userId,
      content: JSON.stringify({
        kind: 'call_invite',
        title: 'Videollamada iniciada',
        url: callUrl
      })
    });

    notifyRecipientInBackground(relation, input.userId, 'Videollamada iniciada', 'Te invitaron a una videollamada.');

    return {
      relationId: relation.id,
      callUrl,
      message: sanitizeMessage(message)
    };
  },

  sendMediaMessage: async (
    input: ResolveRelationInput & { content?: string; file: Express.Multer.File }
  ) => {
    const relation = await resolveRelation(input);
    const content = normalizeOptionalContent(input.content);
    const file = validateImageFile(input.file);
    const mimeType = resolveImageMimeType(file);
    const mediaPath = buildMediaPath({
      relationId: relation.id,
      senderId: input.userId,
      mimeType
    });

    let uploaded = false;

    try {
      await chatRepository.uploadFile({
        bucket: CHAT_MEDIA_BUCKET,
        path: mediaPath,
        buffer: file.buffer,
        contentType: mimeType
      });
      uploaded = true;

      const message = await createImageMessageWithSchemaFallback({
        relationId: relation.id,
        senderId: input.userId,
        content,
        mediaPath,
        mimeType,
        size: file.size
      });

      notifyRecipientInBackground(relation, input.userId, 'Nueva imagen', 'Te enviaron una imagen en el chat.');

      return {
        relationId: relation.id,
        message: await attachSignedMediaUrl(message)
      };
    } catch (error) {
      if (uploaded) {
        await chatRepository.deleteFile(CHAT_MEDIA_BUCKET, mediaPath).catch(() => undefined);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      logChatMediaError(error);
      throw new ApiError(500, 'No pudimos enviar la imagen. Intentá nuevamente.');
    }
  },

  markAsRead: async (input: ResolveRelationInput) => {
    const relation = await resolveRelation(input);

    await chatRepository.markMessagesAsRead(relation.id, input.userId);

    return {
      relationId: relation.id
    };
  },

  clearMessages: async (input: ResolveRelationInput) => {
    const relation = await resolveRelation(input);

    await chatRepository.deleteMessagesByRelationId(relation.id);

    return {
      relationId: relation.id
    };
  }
};

const MAX_MESSAGE_CONTENT_LENGTH = 1000;
const IMAGE_MESSAGE_EMPTY_CONTENT = '__eos_chat_image__';
const VIDEO_CALL_BASE_URL = process.env.VIDEO_CALL_BASE_URL ?? 'https://meet.jit.si';

type LegacyImagePayload = {
  kind: 'image';
  mediaPath: string;
  mediaMimeType?: string;
  mediaSize?: number;
  text?: string;
};

async function resolveRelation(input: ResolveRelationInput) {
  if (input.relationId) {
    const relation = await chatRepository.findRelationById(input.relationId);

    if (!relation || relation.status !== 'active') {
      throw new ApiError(404, 'Relacion de chat no encontrada.');
    }

    if (relation.client_id !== input.userId && relation.specialist_id !== input.userId) {
      throw new ApiError(403, 'No tenes acceso a esta conversacion.');
    }

    return relation;
  }

  if (input.role !== 'user') {
    throw new ApiError(400, 'relationId es requerido para este rol.');
  }

  const relation = await chatRepository.findActiveRelationByClientId(input.userId);

  if (!relation) {
    throw new ApiError(404, 'No tenes un especialista vinculado.');
  }

  return relation;
}

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 50;

  return Math.min(Math.max(limit, 1), 100);
}

function normalizeContent(content: string): string {
  const normalized = content.trim();

  if (!normalized) {
    throw new ApiError(400, 'content es requerido.');
  }

  if (normalized.length > MAX_MESSAGE_CONTENT_LENGTH) {
    throw new ApiError(400, `El mensaje no puede superar ${MAX_MESSAGE_CONTENT_LENGTH} caracteres.`);
  }

  return normalized;
}

function normalizeOptionalContent(content?: string): string {
  if (typeof content !== 'string') {
    return IMAGE_MESSAGE_EMPTY_CONTENT;
  }

  const normalized = content.trim();

  if (normalized.length > MAX_MESSAGE_CONTENT_LENGTH) {
    throw new ApiError(400, `El mensaje no puede superar ${MAX_MESSAGE_CONTENT_LENGTH} caracteres.`);
  }

  return normalized || IMAGE_MESSAGE_EMPTY_CONTENT;
}

function validateImageFile(file: Express.Multer.File): Express.Multer.File {
  if (!file || file.size <= 0 || file.buffer.length === 0) {
    throw new ApiError(400, 'La imagen es obligatoria.');
  }

  const mimeType = resolveImageMimeType(file);

  if (!mimeType) {
    throw new ApiError(400, 'Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  if (file.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
    throw new ApiError(413, `La imagen no puede superar los ${MAX_CHAT_IMAGE_SIZE_MB} MB.`);
  }

  return file;
}

function normalizeImageMimeType(mimeType?: string | null): string {
  if (mimeType === 'image/jpg') {
    return 'image/jpeg';
  }

  return mimeType ?? '';
}

function resolveImageMimeType(file: Express.Multer.File): string {
  const detectedMimeType = detectImageMimeType(file.buffer);
  const declaredMimeType = normalizeImageMimeType(file.mimetype);

  if (!detectedMimeType) {
    throw new ApiError(400, 'El archivo no parece ser una imagen valida.');
  }

  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    !ALLOWED_IMAGE_MIME_TYPES.includes(declaredMimeType)
  ) {
    throw new ApiError(400, 'Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    ALLOWED_IMAGE_MIME_TYPES.includes(declaredMimeType) &&
    declaredMimeType !== detectedMimeType
  ) {
    throw new ApiError(400, 'El archivo no parece ser una imagen valida.');
  }

  return detectedMimeType;
}

function buildMediaPath(input: { relationId: string; senderId: string; mimeType: string }): string {
  const extension = extensionFromMimeType(input.mimeType);
  const random = Math.random().toString(36).slice(2, 10);

  return `${input.relationId}/${input.senderId}/${Date.now()}-${random}.${extension}`;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function bufferMatchesMimeType(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return false;
}

function detectImageMimeType(buffer: Buffer): string | null {
  for (const mimeType of ALLOWED_IMAGE_MIME_TYPES) {
    if (bufferMatchesMimeType(buffer, mimeType)) {
      return mimeType;
    }
  }

  return null;
}

async function attachSignedMediaUrls(messages: ChatMessageRow[]): Promise<ChatMessageResponse[]> {
  return Promise.all(messages.map(attachSignedMediaUrl));
}

async function attachSignedMediaUrl(message: ChatMessageRow): Promise<ChatMessageResponse> {
  const legacyImagePayload = parseLegacyImagePayload(message.content);
  const mediaPath = message.media_path ?? legacyImagePayload?.mediaPath ?? null;
  const publicMessage = sanitizeMessage(message);

  if (!mediaPath) {
    return publicMessage;
  }

  const signedUrl = await chatRepository.createSignedUrl(
    CHAT_MEDIA_BUCKET,
    mediaPath,
    CHAT_MEDIA_SIGNED_URL_EXPIRES_IN
  );

  return {
    ...publicMessage,
    message_type: 'image',
    media_mime_type: publicMessage.media_mime_type ?? legacyImagePayload?.mediaMimeType ?? null,
    media_size: publicMessage.media_size ?? legacyImagePayload?.mediaSize ?? null,
    mediaUrl: signedUrl,
    mediaAvailable: Boolean(signedUrl)
  };
}

function sanitizeMessage(message: ChatMessageRow): ChatMessageResponse {
  const { media_path: _mediaPath, ...publicMessage } = message;
  const legacyImagePayload = parseLegacyImagePayload(publicMessage.content);
  const resolvedType = publicMessage.message_type ?? (legacyImagePayload ? 'image' : 'text');
  const resolvedContent = resolveSanitizedContent(publicMessage.content, resolvedType, legacyImagePayload);

  return {
    ...publicMessage,
    message_type: resolvedType,
    content: resolvedContent,
    media_mime_type: publicMessage.media_mime_type ?? legacyImagePayload?.mediaMimeType ?? null,
    media_size: publicMessage.media_size ?? legacyImagePayload?.mediaSize ?? null
  };
}

function resolveSanitizedContent(
  content: string,
  messageType: 'text' | 'image',
  legacyImagePayload?: LegacyImagePayload | null
): string {
  if (messageType !== 'image') {
    return content;
  }

  if (legacyImagePayload?.text) {
    return legacyImagePayload.text;
  }

  if (content === IMAGE_MESSAGE_EMPTY_CONTENT) {
    return '';
  }

  return legacyImagePayload ? '' : content;
}

async function createImageMessageWithSchemaFallback(input: {
  relationId: string;
  senderId: string;
  content: string;
  mediaPath: string;
  mimeType: string;
  size: number;
}): Promise<ChatMessageRow> {
  try {
    return await chatRepository.createMessage({
      relation_id: input.relationId,
      sender_id: input.senderId,
      content: input.content,
      message_type: 'image',
      media_path: input.mediaPath,
      media_mime_type: input.mimeType,
      media_size: input.size
    });
  } catch (error) {
    if (!isMissingChatMediaColumnsError(error)) {
      throw error;
    }

    const legacyContent = buildLegacyImageContent({
      text: input.content,
      mediaPath: input.mediaPath,
      mimeType: input.mimeType,
      size: input.size
    });

    return chatRepository.createMessage({
      relation_id: input.relationId,
      sender_id: input.senderId,
      content: legacyContent
    });
  }
}

function buildLegacyImageContent(input: {
  text: string;
  mediaPath: string;
  mimeType: string;
  size: number;
}): string {
  const basePayload: LegacyImagePayload = {
    kind: 'image',
    mediaPath: input.mediaPath,
    mediaMimeType: input.mimeType,
    mediaSize: input.size
  };

  if (input.text && input.text !== IMAGE_MESSAGE_EMPTY_CONTENT) {
    basePayload.text = input.text;
  }

  const withText = JSON.stringify(basePayload);

  if (withText.length <= MAX_MESSAGE_CONTENT_LENGTH) {
    return withText;
  }

  const { text: _text, ...withoutText } = basePayload;
  const withoutTextSerialized = JSON.stringify(withoutText);

  if (withoutTextSerialized.length <= MAX_MESSAGE_CONTENT_LENGTH) {
    return withoutTextSerialized;
  }

  throw new ApiError(500, 'No pudimos enviar la imagen. Intentá nuevamente.');
}

function parseLegacyImagePayload(content: string): LegacyImagePayload | null {
  try {
    const parsed = JSON.parse(content) as {
      kind?: unknown;
      mediaPath?: unknown;
      path?: unknown;
      mediaMimeType?: unknown;
      mimeType?: unknown;
      mediaSize?: unknown;
      size?: unknown;
      text?: unknown;
    };

    if (parsed.kind !== 'image') {
      return null;
    }

    const mediaPath = typeof parsed.mediaPath === 'string'
      ? parsed.mediaPath
      : (typeof parsed.path === 'string' ? parsed.path : null);

    if (!mediaPath) {
      return null;
    }

    const payload: LegacyImagePayload = {
      kind: 'image',
      mediaPath
    };

    const mediaMimeType = typeof parsed.mediaMimeType === 'string'
      ? parsed.mediaMimeType
      : (typeof parsed.mimeType === 'string' ? parsed.mimeType : undefined);

    if (mediaMimeType) {
      payload.mediaMimeType = mediaMimeType;
    }

    const mediaSize = typeof parsed.mediaSize === 'number'
      ? parsed.mediaSize
      : (typeof parsed.size === 'number' ? parsed.size : undefined);

    if (typeof mediaSize === 'number' && Number.isFinite(mediaSize)) {
      payload.mediaSize = mediaSize;
    }

    if (typeof parsed.text === 'string' && parsed.text.trim()) {
      payload.text = parsed.text.trim();
    }

    return payload;
  } catch {
    return null;
  }
}

function isMissingChatMediaColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  if (typedError.code !== 'PGRST204') {
    return false;
  }

  const searchable = `${typedError.message ?? ''} ${typedError.details ?? ''} ${typedError.hint ?? ''}`
    .toLowerCase();

  return (
    searchable.includes('chat_messages') &&
    (
      searchable.includes('message_type') ||
      searchable.includes('media_path') ||
      searchable.includes('media_mime_type') ||
      searchable.includes('media_size')
    )
  );
}

async function resolveParticipant(
  relation: { client_id: string; specialist_id: string },
  userId: string
): Promise<{ id: string; fullName: string | null; email: string | null } | null> {
  const participantId = relation.client_id === userId ? relation.specialist_id : relation.client_id;

  const participant = await chatRepository.findProfileById(participantId);

  if (!participant) {
    return null;
  }

  return {
    id: participant.id,
    fullName: participant.full_name,
    email: participant.email
  };
}

function buildCallRoomName(relationId: string): string {
  return `eos-${relationId}-${Date.now()}`;
}

function buildVideoCallUrl(roomName: string): string {
  const safeBase = VIDEO_CALL_BASE_URL.endsWith('/')
    ? VIDEO_CALL_BASE_URL.slice(0, -1)
    : VIDEO_CALL_BASE_URL;

  return `${safeBase}/${encodeURIComponent(roomName)}#config.prejoinPageEnabled=false`;
}

async function notifyRecipient(
  relation: { client_id: string; specialist_id: string },
  senderId: string,
  title: string,
  body: string
): Promise<void> {
  const recipientUserId = relation.client_id === senderId ? relation.specialist_id : relation.client_id;

  await Promise.all([
    notificationsService.sendToUser(recipientUserId, title, body, { type: 'chat' }),
    notificationsService.saveNotification(recipientUserId, title, body, 'chat')
  ]);
}

function notifyRecipientInBackground(
  relation: { client_id: string; specialist_id: string },
  senderId: string,
  title: string,
  body: string
): void {
  void notifyRecipient(relation, senderId, title, body).catch((error) => {
    if (env.nodeEnv !== 'development') {
      return;
    }

    console.warn('[chat:notification:error]', sanitizeNotificationError(error));
  });
}

function logChatMediaError(error: unknown): void {
  if (env.nodeEnv !== 'development') {
    return;
  }

  console.warn('[chat:media:error]', sanitizeNotificationError(error));
}

function sanitizeNotificationError(error: unknown): { name: string; message: string } {
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error)
  };
}
