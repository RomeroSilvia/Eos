import { routinesRepository } from '../routines.repository';
import { routinesService } from '../routines.service';
import type { ProductRow, RoutineStepProductRow } from '../../../database/schema.types';

jest.mock('../routines.repository', () => ({
  routinesRepository: {
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findStepsByRoutineId: jest.fn(),
    createStep: jest.fn(),
    updateStep: jest.fn(),
    removeStep: jest.fn(),
    findProductsByStepId: jest.fn(),
    setStepProducts: jest.fn(),
    attachProductToStep: jest.fn(),
    detachProductFromStep: jest.fn()
  }
}));

const mockedRepo = jest.mocked(routinesRepository);

function makeProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: overrides.id ?? 'product-1',
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? 'Crema hidratante',
    brand: overrides.brand ?? null,
    category: overrides.category ?? null,
    notes: overrides.notes ?? null,
    image_url: overrides.image_url ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z'
  };
}

function makeStepProduct(stepId: string, productId: string): RoutineStepProductRow {
  return {
    id: `sp-${stepId}-${productId}`,
    step_id: stepId,
    product_id: productId,
    created_at: '2026-01-01T00:00:00.000Z'
  };
}

describe('routinesService - productos de pasos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductsByStep', () => {
    it('devuelve los productos de un paso', async () => {
      const products = [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2', name: 'Tónico' })];
      mockedRepo.findProductsByStepId.mockResolvedValue(products);

      const result = await routinesService.getProductsByStep('step-1');

      expect(mockedRepo.findProductsByStepId).toHaveBeenCalledWith('step-1');
      expect(result).toEqual(products);
    });

    it('devuelve array vacío cuando el paso no tiene productos', async () => {
      mockedRepo.findProductsByStepId.mockResolvedValue([]);

      const result = await routinesService.getProductsByStep('step-sin-productos');

      expect(result).toEqual([]);
    });

    it('propaga errores del repositorio', async () => {
      mockedRepo.findProductsByStepId.mockRejectedValue(new Error('Supabase failed'));

      await expect(routinesService.getProductsByStep('step-1')).rejects.toThrow('Supabase failed');
    });
  });

  describe('setStepProducts', () => {
    it('reemplaza todos los productos de un paso', async () => {
      mockedRepo.setStepProducts.mockResolvedValue(undefined);

      await routinesService.setStepProducts('step-1', ['p-1', 'p-2']);

      expect(mockedRepo.setStepProducts).toHaveBeenCalledWith('step-1', ['p-1', 'p-2']);
    });

    it('acepta array vacío para limpiar todos los productos del paso', async () => {
      mockedRepo.setStepProducts.mockResolvedValue(undefined);

      await routinesService.setStepProducts('step-1', []);

      expect(mockedRepo.setStepProducts).toHaveBeenCalledWith('step-1', []);
    });

    it('propaga errores del repositorio', async () => {
      mockedRepo.setStepProducts.mockRejectedValue(new Error('Supabase failed'));

      await expect(routinesService.setStepProducts('step-1', ['p-1'])).rejects.toThrow('Supabase failed');
    });
  });

  describe('attachProductToStep', () => {
    it('asocia un producto a un paso', async () => {
      const stepProduct = makeStepProduct('step-1', 'p-1');
      mockedRepo.attachProductToStep.mockResolvedValue(stepProduct);

      const result = await routinesService.attachProductToStep('step-1', 'p-1');

      expect(mockedRepo.attachProductToStep).toHaveBeenCalledWith('step-1', 'p-1');
      expect(result).toEqual(stepProduct);
    });

    it('propaga errores del repositorio', async () => {
      mockedRepo.attachProductToStep.mockRejectedValue(new Error('Supabase failed'));

      await expect(routinesService.attachProductToStep('step-1', 'p-1')).rejects.toThrow('Supabase failed');
    });
  });

  describe('detachProductFromStep', () => {
    it('desasocia un producto de un paso', async () => {
      mockedRepo.detachProductFromStep.mockResolvedValue(true);

      const result = await routinesService.detachProductFromStep('step-1', 'p-1');

      expect(mockedRepo.detachProductFromStep).toHaveBeenCalledWith('step-1', 'p-1');
      expect(result).toBe(true);
    });

    it('devuelve false cuando la asociación no existe', async () => {
      mockedRepo.detachProductFromStep.mockResolvedValue(false);

      const result = await routinesService.detachProductFromStep('step-1', 'inexistente');

      expect(result).toBe(false);
    });
  });
});
