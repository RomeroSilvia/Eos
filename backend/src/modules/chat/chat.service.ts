import { ApiError } from '../../utils/ApiError';
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

    await notifyRecipient(relation, input.userId, 'Nuevo mensaje', 'Tenes un nuevo mensaje en el chat.');

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

    await notifyRecipient(relation, input.userId, 'Videollamada iniciada', 'Te invitaron a una videollamada.');

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
    const mediaPath = buildMediaPath({
      relationId: relation.id,
      senderId: input.userId,
      mimeType: file.mimetype
    });

    await chatRepository.uploadFile({
      bucket: CHAT_MEDIA_BUCKET,
      path: mediaPath,
      buffer: file.buffer,
      contentType: file.mimetype
    });

    try {
      const message = await chatRepository.createMessage({
        relation_id: relation.id,
        sender_id: input.userId,
        content,
        message_type: 'image',
        media_path: mediaPath,
        media_mime_type: file.mimetype,
        media_size: file.size
      });

      await notifyRecipient(relation, input.userId, 'Nueva imagen', 'Te enviaron una imagen en el chat.');

      return {
        relationId: relation.id,
        message: await attachSignedMediaUrl(message)
      };
    } catch (error) {
      await chatRepository.deleteFile(CHAT_MEDIA_BUCKET, mediaPath).catch(() => undefined);
      throw error;
    }
  },

  markAsRead: async (input: ResolveRelationInput) => {
    const relation = await resolveRelation(input);

    await chatRepository.markMessagesAsRead(relation.id, input.userId);

    return {
      relationId: relation.id
    };
  }
};

const MAX_MESSAGE_CONTENT_LENGTH = 1000;
const VIDEO_CALL_BASE_URL = process.env.VIDEO_CALL_BASE_URL ?? 'https://meet.jit.si';

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
    return '';
  }

  const normalized = content.trim();

  if (normalized.length > MAX_MESSAGE_CONTENT_LENGTH) {
    throw new ApiError(400, `El mensaje no puede superar ${MAX_MESSAGE_CONTENT_LENGTH} caracteres.`);
  }

  return normalized;
}

function validateImageFile(file: Express.Multer.File): Express.Multer.File {
  if (!file || file.size <= 0 || file.buffer.length === 0) {
    throw new ApiError(400, 'La imagen es obligatoria.');
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new ApiError(400, 'Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  if (!bufferMatchesMimeType(file.buffer, file.mimetype)) {
    throw new ApiError(400, 'El archivo no parece ser una imagen valida.');
  }

  if (file.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
    throw new ApiError(413, `La imagen no puede superar los ${MAX_CHAT_IMAGE_SIZE_MB} MB.`);
  }

  return file;
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

async function attachSignedMediaUrls(messages: ChatMessageRow[]): Promise<ChatMessageResponse[]> {
  return Promise.all(messages.map(attachSignedMediaUrl));
}

async function attachSignedMediaUrl(message: ChatMessageRow): Promise<ChatMessageResponse> {
  const publicMessage = sanitizeMessage(message);

  if (message.message_type !== 'image' || !message.media_path) {
    return publicMessage;
  }

  const signedUrl = await chatRepository.createSignedUrl(
    CHAT_MEDIA_BUCKET,
    message.media_path,
    CHAT_MEDIA_SIGNED_URL_EXPIRES_IN
  );

  return {
    ...publicMessage,
    mediaUrl: signedUrl,
    mediaAvailable: Boolean(signedUrl)
  };
}

function sanitizeMessage(message: ChatMessageRow): ChatMessageResponse {
  const { media_path: _mediaPath, ...publicMessage } = message;

  return publicMessage;
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

  await notificationsService.sendToUser(recipientUserId, title, body, {
    type: 'chat'
  });
}
