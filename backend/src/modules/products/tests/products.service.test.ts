/// <reference types="jest" />

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../utils/ApiError';
import { productsRepository } from '../products.repository';
import { productsService } from '../products.service';

jest.mock('../products.repository', () => ({
  productsRepository: {
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findUsagesInActiveRoutines: jest.fn(),
    detachFromAllSteps: jest.fn(),
    replaceProductInSteps: jest.fn()
  }
}));

jest.mock('../../audit/audit.service', () => ({
  recordAuditLog: jest.fn(async () => undefined)
}));

const mockedRepository = jest.mocked(productsRepository);
const { recordAuditLog } = jest.requireMock('../../audit/audit.service') as {
  recordAuditLog: jest.Mock;
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('productsService.remove - proteccion CRITICO-02', () => {
  it('elimina si el producto no esta en rutinas activas', async () => {
    mockedRepository.findById.mockResolvedValue({ id: 'prod-1' } as any);
    mockedRepository.findUsagesInActiveRoutines.mockResolvedValue([] as any);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.remove('prod-1', 'user-1');

    expect(result).toBe(true);
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1',
      action: 'delete',
      entity: 'product',
      entityId: 'prod-1'
    }));
  });

  it('lanza 409 con rutinas afectadas si esta en uso', async () => {
    mockedRepository.findById.mockResolvedValue({ id: 'prod-1' } as any);
    mockedRepository.findUsagesInActiveRoutines.mockResolvedValue([
      {
        id: 'usage-1',
        routine_steps: {
          id: 'step-1',
          name: 'Limpieza',
          routines: {
            id: 'routine-1',
            name: 'Rutina maniana',
            is_active: true
          }
        }
      }
    ] as any);

    await expect(productsService.remove('prod-1', 'user-1')).rejects.toMatchObject({
      statusCode: 409
    } as Partial<ApiError>);
  });

  it('no consulta usos ni elimina productos ajenos', async () => {
    mockedRepository.findById.mockResolvedValue(null);

    await expect(productsService.remove('prod-ajeno', 'user-1')).rejects.toMatchObject({
      statusCode: 404
    } as Partial<ApiError>);
    expect(mockedRepository.findUsagesInActiveRoutines).not.toHaveBeenCalled();
    expect(mockedRepository.remove).not.toHaveBeenCalled();
  });
});

describe('productsService.forceRemove', () => {
  it('elimina relaciones y luego el producto', async () => {
    mockedRepository.findById.mockResolvedValue({ id: 'prod-1' } as any);
    mockedRepository.detachFromAllSteps.mockResolvedValue(undefined);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.forceRemove('prod-1', 'user-1');

    expect(result).toBe(true);
    expect(mockedRepository.detachFromAllSteps).toHaveBeenCalledWith('prod-1');
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1',
      action: 'delete',
      entity: 'product',
      entityId: 'prod-1',
      metadata: { changeType: 'force_remove_detached_from_steps' }
    }));
  });

  it('no toca rutinas si el producto no pertenece al usuario', async () => {
    mockedRepository.findById.mockResolvedValue(null);

    await expect(productsService.forceRemove('prod-ajeno', 'user-1')).rejects.toMatchObject({
      statusCode: 404
    } as Partial<ApiError>);
    expect(mockedRepository.detachFromAllSteps).not.toHaveBeenCalled();
  });
});

describe('productsService.replaceInRoutines', () => {
  it('reemplaza product_id y elimina producto original', async () => {
    mockedRepository.findById
      .mockResolvedValueOnce({ id: 'prod-1' } as any)
      .mockResolvedValueOnce({ id: 'prod-2' } as any);
    mockedRepository.replaceProductInSteps.mockResolvedValue(undefined);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.replaceInRoutines('prod-1', 'prod-2', 'user-1');

    expect(result).toBe(true);
    expect(mockedRepository.replaceProductInSteps).toHaveBeenCalledWith('prod-1', 'prod-2');
    expect(recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1',
      action: 'delete',
      entity: 'product',
      entityId: 'prod-1',
      metadata: { changeType: 'replaced_in_routines', replacementProductId: 'prod-2' }
    }));
  });

  it('no reemplaza si el producto original no pertenece al usuario', async () => {
    mockedRepository.findById.mockResolvedValue(null);

    await expect(productsService.replaceInRoutines('prod-ajeno', 'prod-2', 'user-1')).rejects.toMatchObject({
      statusCode: 404
    } as Partial<ApiError>);
    expect(mockedRepository.replaceProductInSteps).not.toHaveBeenCalled();
  });
});
