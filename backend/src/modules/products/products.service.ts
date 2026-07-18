import type { ProductInsert, ProductUpdate } from '../../database/schema.types';
import { ApiError } from '../../utils/ApiError';
import { productsRepository } from './products.repository';
import { recordAuditLog } from '../audit/audit.service';

type ProductUsageDetail = {
  routineId: string;
  routineName: string;
  stepName: string;
};

export const productsService = {
  getHealth: () => ({
    module: 'products',
    status: 'ready'
  }),

  getByUser: (userId: string) => {
    return productsRepository.findAllByUserId(userId);
  },

  getById: (productId: string, userId: string) => {
    return productsRepository.findById(productId, userId);
  },

  create: (payload: ProductInsert) => {
    return productsRepository.create(payload);
  },

  update: (productId: string, userId: string, payload: ProductUpdate) => {
    return productsRepository.update(productId, userId, {
      ...payload,
      updated_at: new Date().toISOString()
    });
  },

  remove: async (productId: string, userId: string) => {
    const product = await productsRepository.findById(productId, userId);

    if (!product) {
      throw new ApiError(404, 'Producto no encontrado.');
    }

    const usages = await productsRepository.findUsagesInActiveRoutines(productId);

    const activeUsages = usages
      .map((usage) => {
        const step = (usage as any).routine_steps;
        const routine = step?.routines;

        if (!step || !routine || routine.is_active !== true) {
          return null;
        }

        return {
          routineId: routine.id as string,
          routineName: routine.name as string,
          stepName: step.name as string
        } as ProductUsageDetail;
      })
      .filter(Boolean) as ProductUsageDetail[];

    if (activeUsages.length > 0) {
      throw new ApiError(409, 'El producto esta en uso en rutinas activas.', {
        affectedRoutines: activeUsages
      });
    }

    const removed = await productsRepository.remove(productId, userId);

    if (removed) {
      void recordAuditLog({
        actorId: userId,
        actorRole: 'user',
        action: 'delete',
        entity: 'product',
        entityId: productId,
        before: product
      });
    }

    return removed;
  },

  forceRemove: async (productId: string, userId: string) => {
    const product = await productsRepository.findById(productId, userId);

    if (!product) {
      throw new ApiError(404, 'Producto no encontrado.');
    }

    await productsRepository.detachFromAllSteps(productId);
    const removed = await productsRepository.remove(productId, userId);

    if (removed) {
      void recordAuditLog({
        actorId: userId,
        actorRole: 'user',
        action: 'delete',
        entity: 'product',
        entityId: productId,
        before: product,
        metadata: { changeType: 'force_remove_detached_from_steps' }
      });
    }

    return removed;
  },

  replaceInRoutines: async (productId: string, replacementProductId: string, userId: string) => {
    if (productId === replacementProductId) {
      throw new ApiError(400, 'El producto de reemplazo debe ser distinto al original.');
    }

    const product = await productsRepository.findById(productId, userId);
    if (!product) {
      throw new ApiError(404, 'Producto no encontrado.');
    }

    const replacement = await productsRepository.findById(replacementProductId, userId);
    if (!replacement) {
      throw new ApiError(404, 'No se encontro el producto de reemplazo.');
    }

    await productsRepository.replaceProductInSteps(productId, replacementProductId);
    const removed = await productsRepository.remove(productId, userId);

    if (removed) {
      void recordAuditLog({
        actorId: userId,
        actorRole: 'user',
        action: 'delete',
        entity: 'product',
        entityId: productId,
        before: product,
        metadata: { changeType: 'replaced_in_routines', replacementProductId }
      });
    }

    return removed;
  }
};
