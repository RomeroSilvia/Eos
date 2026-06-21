/// <reference types="jest" />

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { notificationsRepository } from '../notifications.repository';
import { notificationsService } from '../notifications.service';

jest.mock('../notifications.repository', () => ({
  notificationsRepository: {
    upsertToken: jest.fn(),
    deleteToken: jest.fn(),
    findTokenByUserId: jest.fn(),
    findTokensByUserIds: jest.fn()
  }
}));

const mockedRepository = jest.mocked(notificationsRepository);

const makePushTokenRow = (overrides = {}) => ({
  id: 'token-id-1',
  user_id: 'user-1',
  expo_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  platform: 'android' as const,
  updated_at: new Date().toISOString(),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notificationsService.registerToken', () => {
  it('hace upsert correctamente en push_tokens', async () => {
    const tokenRow = makePushTokenRow();
    mockedRepository.upsertToken.mockResolvedValue(tokenRow as any);

    const result = await notificationsService.registerToken('user-1', tokenRow.expo_token, 'android');

    expect(mockedRepository.upsertToken).toHaveBeenCalledWith('user-1', tokenRow.expo_token, 'android');
    expect(result).toEqual(tokenRow);
  });

  it('actualiza el token si el usuario ya tiene uno registrado', async () => {
    const tokenRow = makePushTokenRow({ expo_token: 'ExponentPushToken[nuevo]' });
    mockedRepository.upsertToken.mockResolvedValue(tokenRow as any);

    await notificationsService.registerToken('user-1', 'ExponentPushToken[nuevo]', 'ios');

    expect(mockedRepository.upsertToken).toHaveBeenCalledTimes(1);
    expect(mockedRepository.upsertToken).toHaveBeenCalledWith('user-1', 'ExponentPushToken[nuevo]', 'ios');
  });
});

describe('notificationsService.deleteToken', () => {
  it('elimina el token del usuario', async () => {
    mockedRepository.deleteToken.mockResolvedValue(undefined);

    await notificationsService.deleteToken('user-1');

    expect(mockedRepository.deleteToken).toHaveBeenCalledWith('user-1');
  });
});

describe('notificationsService.sendToUser', () => {
  it('no falla si el usuario no tiene token registrado', async () => {
    mockedRepository.findTokenByUserId.mockResolvedValue(null);

    await expect(
      notificationsService.sendToUser('user-sin-token', 'Título', 'Cuerpo')
    ).resolves.toBeUndefined();
  });

  it('llama a la Expo Push API con el payload correcto', async () => {
    const tokenRow = makePushTokenRow();
    mockedRepository.findTokenByUserId.mockResolvedValue(tokenRow as any);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    await notificationsService.sendToUser('user-1', 'Nueva rutina', 'Tu especialista te asignó una rutina', { routineId: 'r-1' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify([
          {
            to: tokenRow.expo_token,
            title: 'Nueva rutina',
            body: 'Tu especialista te asignó una rutina',
            data: { routineId: 'r-1' }
          }
        ])
      })
    );

    fetchSpy.mockRestore();
  });

  it('no lanza error si la Expo Push API falla', async () => {
    const tokenRow = makePushTokenRow();
    mockedRepository.findTokenByUserId.mockResolvedValue(tokenRow as any);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(
      notificationsService.sendToUser('user-1', 'Título', 'Cuerpo')
    ).resolves.toBeUndefined();
  });
});
