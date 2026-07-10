import { ApiError } from '../../../utils/ApiError';
import { MAX_CHAT_IMAGE_SIZE_BYTES } from '../chat.constants';
import { chatRepository } from '../chat.repository';
import { chatService } from '../chat.service';
import type { ChatMessageRow } from '../chat.types';

jest.mock('../chat.repository', () => ({
  chatRepository: {
    findActiveRelationByClientId: jest.fn(),
    findRelationById: jest.fn(),
    findMessages: jest.fn(),
    findMessageById: jest.fn(),
    createMessage: jest.fn(),
    markMessagesAsRead: jest.fn(),
    deleteMessagesByRelationId: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    createSignedUrl: jest.fn(),
    findProfileById: jest.fn(),
    countMonthlyTextMessagesBySender: jest.fn(),
    countMonthlyImageMessagesBySender: jest.fn()
  }
}));

jest.mock('../../subscriptions/subscriptions.repository', () => ({
  subscriptionsRepository: {
    findCurrentSubscriptionByUserId: jest.fn()
  }
}));

jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: {
    sendToUser: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockedRepository = jest.mocked(chatRepository);
const mockedSubscriptionsRepository = jest.mocked(require('../../subscriptions/subscriptions.repository').subscriptionsRepository);

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubscriptionsRepository.findCurrentSubscriptionByUserId.mockResolvedValue(null);
    mockedRepository.countMonthlyTextMessagesBySender.mockResolvedValue(0);
    mockedRepository.countMonthlyImageMessagesBySender.mockResolvedValue(0);
  });

  describe('sendMessage', () => {
    it('envia mensaje en una relacion activa y recorta espacios del contenido', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      });
      mockedRepository.createMessage.mockResolvedValue({
        id: 'message-1',
        relation_id: 'relation-1',
        sender_id: 'user-1',
        content: 'hola especialista',
        message_type: 'text',
        media_path: null,
        media_mime_type: null,
        media_size: null,
        read_at: null,
        created_at: '2026-06-19T12:00:00.000Z'
      });

      const result = await chatService.sendMessage({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1',
        content: '  hola especialista  '
      });

      expect(mockedRepository.createMessage).toHaveBeenCalledWith({
        relation_id: 'relation-1',
        sender_id: 'user-1',
        content: 'hola especialista',
        message_type: 'text',
        media_path: null,
        media_mime_type: null,
        media_size: null
      });
      expect(result.relationId).toBe('relation-1');
    });

    it('exige relationId para rol specialist', async () => {
      await expect(
        chatService.sendMessage({
          userId: 'specialist-1',
          role: 'specialist',
          content: 'hola'
        })
      ).rejects.toMatchObject({
        statusCode: 400
      } as Partial<ApiError>);
    });

    it('usa la relacion activa del cliente cuando no se envia relationId', async () => {
      mockedRepository.findActiveRelationByClientId.mockResolvedValue({
        id: 'relation-2',
        client_id: 'user-88',
        specialist_id: 'specialist-8',
        status: 'active'
      });
      mockedRepository.createMessage.mockResolvedValue({
        id: 'message-2',
        relation_id: 'relation-2',
        sender_id: 'user-88',
        content: 'consulta',
        message_type: 'text',
        media_path: null,
        media_mime_type: null,
        media_size: null,
        read_at: null,
        created_at: '2026-06-19T12:10:00.000Z'
      });

      const result = await chatService.sendMessage({
        userId: 'user-88',
        role: 'user',
        content: 'consulta'
      });

      expect(mockedRepository.findActiveRelationByClientId).toHaveBeenCalledWith('user-88');
      expect(result.relationId).toBe('relation-2');
    });

    it('rechaza mensajes vacios', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      });

      await expect(
        chatService.sendMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          content: '   '
        })
      ).rejects.toMatchObject({
        statusCode: 400
      } as Partial<ApiError>);
      expect(mockedRepository.createMessage).not.toHaveBeenCalled();
    });

    it('rechaza mensajes demasiado largos', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'user-1',
        specialist_id: 'specialist-1',
        status: 'active'
      });

      await expect(
        chatService.sendMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          content: 'a'.repeat(1001)
        })
      ).rejects.toMatchObject({
        statusCode: 400
      } as Partial<ApiError>);
      expect(mockedRepository.createMessage).not.toHaveBeenCalled();
    });

    it('rechaza mensajes cuando supera tokens mensuales sin plan', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.countMonthlyTextMessagesBySender.mockResolvedValue(10);

      await expect(
        chatService.sendMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          content: 'hola'
        })
      ).rejects.toMatchObject({ statusCode: 403 } as Partial<ApiError>);
    });
  });

  describe('sendMediaMessage', () => {
    it('rechaza imagen si el usuario no pertenece a la relacion activa', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'other-user',
        specialist_id: 'specialist-1',
        status: 'active'
      });

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile()
        })
      ).rejects.toMatchObject({
        statusCode: 403
      } as Partial<ApiError>);
      expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    });

    it('rechaza MIME invalido antes de subir el archivo', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' })
        })
      ).rejects.toMatchObject({
        statusCode: 400
      } as Partial<ApiError>);
      expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    });

    it('rechaza archivo con firma binaria invalida aunque declare MIME permitido', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile({ buffer: Buffer.from('not-an-image') })
        })
      ).rejects.toMatchObject({
        statusCode: 400
      } as Partial<ApiError>);
      expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    });

    it('acepta imagen menor a 15 MB', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockResolvedValue(undefined);
      mockedRepository.createSignedUrl.mockResolvedValue('https://signed.local/image');
      mockedRepository.createMessage.mockImplementation(async (payload) => ({
        id: 'message-image-1',
        relation_id: payload.relation_id,
        sender_id: payload.sender_id,
        content: payload.content,
        message_type: 'image',
        media_path: payload.media_path ?? null,
        media_mime_type: payload.media_mime_type ?? null,
        media_size: payload.media_size ?? null,
        read_at: null,
        created_at: '2026-06-19T12:20:00.000Z'
      }));

      const result = await chatService.sendMediaMessage({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1',
        file: buildImageFile({ size: MAX_CHAT_IMAGE_SIZE_BYTES - 1 })
      });

      expect(mockedRepository.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: 'chat-media'
        })
      );
      expect(mockedRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: 'image',
          content: '__eos_chat_image__'
        })
      );
      expect(result.message.content).toBe('');
      expect(result.message.mediaAvailable).toBe(true);
    });

    it('acepta imagen valida aunque el cliente la envie como application/octet-stream', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockResolvedValue(undefined);
      mockedRepository.createSignedUrl.mockResolvedValue('https://signed.local/image');
      mockedRepository.createMessage.mockImplementation(async (payload) => ({
        id: 'message-image-1',
        relation_id: payload.relation_id,
        sender_id: payload.sender_id,
        content: payload.content,
        message_type: 'image',
        media_path: payload.media_path ?? null,
        media_mime_type: payload.media_mime_type ?? null,
        media_size: payload.media_size ?? null,
        read_at: null,
        created_at: '2026-06-19T12:20:00.000Z'
      }));

      await chatService.sendMediaMessage({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1',
        file: buildImageFile({ mimetype: 'application/octet-stream', originalname: 'foto' })
      });

      expect(mockedRepository.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
          path: expect.stringMatching(/\.jpg$/)
        })
      );
      expect(mockedRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          media_mime_type: 'image/jpeg'
        })
      );
    });

    it('normaliza image/jpg como image/jpeg', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockResolvedValue(undefined);
      mockedRepository.createSignedUrl.mockResolvedValue('https://signed.local/image');
      mockedRepository.createMessage.mockImplementation(async (payload) => ({
        id: 'message-image-1',
        relation_id: payload.relation_id,
        sender_id: payload.sender_id,
        content: payload.content,
        message_type: 'image',
        media_path: payload.media_path ?? null,
        media_mime_type: payload.media_mime_type ?? null,
        media_size: payload.media_size ?? null,
        read_at: null,
        created_at: '2026-06-19T12:20:00.000Z'
      }));

      await chatService.sendMediaMessage({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1',
        file: buildImageFile({ mimetype: 'image/jpg' })
      });

      expect(mockedRepository.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg'
        })
      );
    });

    it('rechaza imagen mayor a 15 MB', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile({ size: MAX_CHAT_IMAGE_SIZE_BYTES + 1 })
        })
      ).rejects.toMatchObject({
        statusCode: 413
      } as Partial<ApiError>);
      expect(mockedRepository.uploadFile).not.toHaveBeenCalled();
    });

    it('rechaza imagen cuando supera tokens mensuales sin plan', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.countMonthlyImageMessagesBySender.mockResolvedValue(2);

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile()
        })
      ).rejects.toMatchObject({ statusCode: 403 } as Partial<ApiError>);
    });

    it('sube imagen a chat-media y guarda media_path sin URL publica', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockResolvedValue(undefined);
      mockedRepository.createSignedUrl.mockResolvedValue('https://signed.local/image');
      mockedRepository.createMessage.mockImplementation(async (payload) => ({
        id: 'message-image-1',
        relation_id: payload.relation_id,
        sender_id: payload.sender_id,
        content: payload.content,
        message_type: 'image',
        media_path: payload.media_path ?? null,
        media_mime_type: payload.media_mime_type ?? null,
        media_size: payload.media_size ?? null,
        read_at: null,
        created_at: '2026-06-19T12:20:00.000Z'
      }));

      const result = await chatService.sendMediaMessage({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1',
        content: 'foto',
        file: buildImageFile({ mimetype: 'image/jpeg', size: 1024 })
      });

      expect(mockedRepository.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: 'chat-media',
          path: expect.stringMatching(/^relation-1\/user-1\/.+\.jpg$/),
          contentType: 'image/jpeg'
        })
      );
      expect(mockedRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: 'image',
          media_path: expect.stringMatching(/^relation-1\/user-1\/.+\.jpg$/),
          media_mime_type: 'image/jpeg',
          media_size: 1024
        })
      );
      expect(mockedRepository.createMessage.mock.calls[0][0].media_path).not.toContain('http');
      expect(result.message.mediaUrl).toBe('https://signed.local/image');
      expect('media_path' in result.message).toBe(false);
    });

    it('limpia el archivo subido y devuelve error controlado si falla la insercion en DB', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockResolvedValue(undefined);
      mockedRepository.createMessage.mockRejectedValue(new Error('db failed'));
      mockedRepository.deleteFile.mockResolvedValue(undefined);

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile()
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'No pudimos enviar la imagen. Intentá nuevamente.'
      } as Partial<ApiError>);
      expect(mockedRepository.deleteFile).toHaveBeenCalledWith(
        'chat-media',
        expect.stringMatching(/^relation-1\/user-1\/.+\.jpg$/)
      );
    });

    it('devuelve error controlado si falla la subida a Storage', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.uploadFile.mockRejectedValue(new Error('bucket not found'));

      await expect(
        chatService.sendMediaMessage({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1',
          file: buildImageFile()
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        message: 'No pudimos enviar la imagen. Intentá nuevamente.'
      } as Partial<ApiError>);
      expect(mockedRepository.createMessage).not.toHaveBeenCalled();
      expect(mockedRepository.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('startVideoCall', () => {
    it('rechaza videollamada cuando el usuario no tiene plan', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());

      await expect(
        chatService.startVideoCall({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1'
        })
      ).rejects.toMatchObject({ statusCode: 403 } as Partial<ApiError>);
    });
  });

  describe('getMessages', () => {
    it('devuelve signed URL para mensajes con imagen', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.findProfileById.mockResolvedValue({
        id: 'specialist-1',
        full_name: 'Especialista',
        email: 'specialist@example.com'
      });
      mockedRepository.findMessages.mockResolvedValue([
        buildImageMessage({ media_path: 'relation-1/user-1/image.jpg' })
      ]);
      mockedRepository.createSignedUrl.mockResolvedValue('https://signed.local/image');

      const result = await chatService.getMessages({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1'
      });

      expect(mockedRepository.createSignedUrl).toHaveBeenCalledWith(
        'chat-media',
        'relation-1/user-1/image.jpg',
        15 * 60
      );
      expect(result.messages[0].mediaUrl).toBe('https://signed.local/image');
      expect(result.messages[0].mediaAvailable).toBe(true);
    });

    it('no rompe el historial si falta una imagen en Storage', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.findProfileById.mockResolvedValue(null);
      mockedRepository.findMessages.mockResolvedValue([
        buildImageMessage({ media_path: 'relation-1/user-1/missing.jpg' })
      ]);
      mockedRepository.createSignedUrl.mockResolvedValue(null);

      const result = await chatService.getMessages({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1'
      });

      expect(result.messages[0].mediaUrl).toBeNull();
      expect(result.messages[0].mediaAvailable).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('vacia mensajes solo despues de validar la relacion activa del usuario', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.deleteMessagesByRelationId.mockResolvedValue(undefined);

      const result = await chatService.clearMessages({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1'
      });

      expect(mockedRepository.deleteMessagesByRelationId).toHaveBeenCalledWith('relation-1');
      expect(result).toEqual({ relationId: 'relation-1' });
    });

    it('rechaza vaciar mensajes de una relacion ajena', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'other-user',
        specialist_id: 'specialist-1',
        status: 'active'
      });

      await expect(
        chatService.clearMessages({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1'
        })
      ).rejects.toMatchObject({
        statusCode: 403
      } as Partial<ApiError>);
      expect(mockedRepository.deleteMessagesByRelationId).not.toHaveBeenCalled();
    });

    it('usa la relacion activa del cliente si no se envia relationId', async () => {
      mockedRepository.findActiveRelationByClientId.mockResolvedValue({
        id: 'relation-2',
        client_id: 'user-2',
        specialist_id: 'specialist-2',
        status: 'active'
      });
      mockedRepository.deleteMessagesByRelationId.mockResolvedValue(undefined);

      const result = await chatService.clearMessages({
        userId: 'user-2',
        role: 'user'
      });

      expect(mockedRepository.findActiveRelationByClientId).toHaveBeenCalledWith('user-2');
      expect(mockedRepository.deleteMessagesByRelationId).toHaveBeenCalledWith('relation-2');
      expect(result).toEqual({ relationId: 'relation-2' });
    });
  });

  describe('markAsRead', () => {
    it('marca como leidos solo mensajes de la relacion activa donde el sender es otro usuario', async () => {
      mockedRepository.findRelationById.mockResolvedValue(buildRelation());
      mockedRepository.markMessagesAsRead.mockResolvedValue(undefined);

      const result = await chatService.markAsRead({
        userId: 'user-1',
        role: 'user',
        relationId: 'relation-1'
      });

      expect(mockedRepository.markMessagesAsRead).toHaveBeenCalledWith('relation-1', 'user-1');
      expect(result).toEqual({ relationId: 'relation-1' });
    });

    it('usa la relacion activa del cliente cuando no se envia relationId', async () => {
      mockedRepository.findActiveRelationByClientId.mockResolvedValue({
        id: 'relation-55',
        client_id: 'user-55',
        specialist_id: 'specialist-55',
        status: 'active'
      });
      mockedRepository.markMessagesAsRead.mockResolvedValue(undefined);

      const result = await chatService.markAsRead({
        userId: 'user-55',
        role: 'user'
      });

      expect(mockedRepository.findActiveRelationByClientId).toHaveBeenCalledWith('user-55');
      expect(mockedRepository.markMessagesAsRead).toHaveBeenCalledWith('relation-55', 'user-55');
      expect(result).toEqual({ relationId: 'relation-55' });
    });

    it('rechaza marcar leidos en una relacion ajena', async () => {
      mockedRepository.findRelationById.mockResolvedValue({
        id: 'relation-1',
        client_id: 'other-user',
        specialist_id: 'specialist-1',
        status: 'active'
      });

      await expect(
        chatService.markAsRead({
          userId: 'user-1',
          role: 'user',
          relationId: 'relation-1'
        })
      ).rejects.toMatchObject({
        statusCode: 403
      } as Partial<ApiError>);

      expect(mockedRepository.markMessagesAsRead).not.toHaveBeenCalled();
    });
  });
});

function buildRelation() {
  return {
    id: 'relation-1',
    client_id: 'user-1',
    specialist_id: 'specialist-1',
    status: 'active' as const
  };
}

function buildImageFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  const size = overrides.size ?? 1024;
  const defaultBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(Math.max(Math.min(size, 1024) - 4, 0), 1)
  ]);

  return {
    fieldname: 'image',
    originalname: 'image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: defaultBuffer,
    size,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides
  };
}

function buildImageMessage(overrides: Partial<ChatMessageRow> = {}): ChatMessageRow {
  return {
    id: 'message-image-1',
    relation_id: 'relation-1',
    sender_id: 'user-1',
    content: '',
    message_type: 'image' as const,
    media_path: 'relation-1/user-1/image.jpg',
    media_mime_type: 'image/jpeg',
    media_size: 1024,
    read_at: null,
    created_at: '2026-06-19T12:20:00.000Z',
    ...overrides
  };
}
