import { ApiError } from '../../../utils/ApiError';
import { chatRepository } from '../chat.repository';
import { chatService } from '../chat.service';

jest.mock('../chat.repository', () => ({
  chatRepository: {
    findActiveRelationByClientId: jest.fn(),
    findRelationById: jest.fn(),
    findMessages: jest.fn(),
    createMessage: jest.fn(),
    markMessagesAsRead: jest.fn()
  }
}));

jest.mock('../../notifications/notifications.service', () => ({
  notificationsService: {
    sendToUser: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockedRepository = jest.mocked(chatRepository);

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        content: 'hola especialista'
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
  });
});
