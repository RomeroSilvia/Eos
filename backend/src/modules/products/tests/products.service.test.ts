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

const mockedRepository = jest.mocked(productsRepository);

describe('productsService.remove - proteccion CRITICO-02', () => {
  beforeEach(() => {
    mockedRepository.findUsagesInActiveRoutines.mockReset();
    mockedRepository.remove.mockReset();
  });

  it('elimina si el producto no esta en rutinas activas', async () => {
    mockedRepository.findUsagesInActiveRoutines.mockResolvedValue([] as any);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.remove('prod-1', 'user-1');

    expect(result).toBe(true);
  });

  it('lanza 409 con rutinas afectadas si esta en uso', async () => {
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
});

describe('productsService.forceRemove', () => {
  it('elimina relaciones y luego el producto', async () => {
    mockedRepository.detachFromAllSteps.mockResolvedValue(undefined);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.forceRemove('prod-1', 'user-1');

    expect(result).toBe(true);
    expect(mockedRepository.detachFromAllSteps).toHaveBeenCalledWith('prod-1');
  });
});

describe('productsService.replaceInRoutines', () => {
  it('reemplaza product_id y elimina producto original', async () => {
    mockedRepository.findById.mockResolvedValue({ id: 'prod-2' } as any);
    mockedRepository.replaceProductInSteps.mockResolvedValue(undefined);
    mockedRepository.remove.mockResolvedValue(true);

    const result = await productsService.replaceInRoutines('prod-1', 'prod-2', 'user-1');

    expect(result).toBe(true);
    expect(mockedRepository.replaceProductInSteps).toHaveBeenCalledWith('prod-1', 'prod-2');
  });
});
