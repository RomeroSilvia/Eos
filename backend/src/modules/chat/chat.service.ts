import { ApiError } from '../../utils/ApiError';
import { chatRepository } from './chat.repository';
import { notificationsService } from '../notifications/notifications.service';

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

    return {
      relationId: relation.id,
      participant,
      messages
    };
  },

  sendMessage: async (input: ResolveRelationInput & { content: string }) => {
    const relation = await resolveRelation(input);
    const content = normalizeContent(input.content);

    const message = await chatRepository.createMessage({
      relation_id: relation.id,
      sender_id: input.userId,
      content
    });

    await notifyRecipient(relation, input.userId, 'Nuevo mensaje', 'Tenes un nuevo mensaje en el chat.');

    return {
      relationId: relation.id,
      message
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
      message
    };
  },

  sendMediaMessage: async (
    input: ResolveRelationInput & { file: Express.Multer.File }
  ) => {
    const relation = await resolveRelation(input);
    if (input.file.size > MAX_MEDIA_BYTES) {
      throw new ApiError(413, 'El archivo supera el maximo de 20 MB.');
    }

    const mediaType = resolveMediaType(input.file.mimetype);
    const mediaPath = buildMediaPath({
      relationId: relation.id,
      senderId: input.userId,
      mimeType: input.file.mimetype
    });

    try {
      await chatRepository.uploadFile({
        bucket: CHAT_MEDIA_BUCKET,
        path: mediaPath,
        buffer: input.file.buffer,
        contentType: input.file.mimetype
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el archivo.';

      if (message.toLowerCase().includes('bucket not found')) {
        throw new ApiError(
          500,
          `No existe el bucket de chat (${CHAT_MEDIA_BUCKET}). Configura CHAT_MEDIA_BUCKET o crea ese bucket en Supabase.`
        );
      }

      throw error;
    }

    const mediaUrl = chatRepository.getPublicUrl(CHAT_MEDIA_BUCKET, mediaPath);

    const message = await chatRepository.createMessage({
      relation_id: relation.id,
      sender_id: input.userId,
      content: JSON.stringify({
        kind: mediaType,
        url: mediaUrl,
        mimeType: input.file.mimetype,
        fileName: input.file.originalname ?? null
      })
    });

    await notifyRecipient(relation, input.userId, 'Nuevo archivo', 'Te enviaron un archivo en el chat.');

    return {
      relationId: relation.id,
      message
    };
  },

  markAsRead: async (input: ResolveRelationInput) => {
    const relation = await resolveRelation(input);

    await chatRepository.markMessagesAsRead(relation.id, input.userId);

    return {
      relationId: relation.id
    };
  }
};

const CHAT_MEDIA_BUCKET = process.env.CHAT_MEDIA_BUCKET ?? 'product-images';
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
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

  return normalized;
}

function resolveMediaType(mimeType: string): 'image' | 'video' | 'file' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  return 'file';
}

function buildMediaPath(input: { relationId: string; senderId: string; mimeType: string }): string {
  const extension = extensionFromMimeType(input.mimeType);

  return `relations/${input.relationId}/${input.senderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/quicktime') return 'mov';
  if (mimeType === 'video/webm') return 'webm';

  return 'bin';
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
