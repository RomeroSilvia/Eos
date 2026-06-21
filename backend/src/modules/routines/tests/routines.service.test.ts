import { routinesRepository } from '../routines.repository';
import { routinesService } from '../routines.service';
import type { ProductRow, RoutineRow, RoutineStepProductRow } from '../../../database/schema.types';

jest.mock('../routines.repository', () => ({
  routinesRepository: {
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    findRawById: jest.fn(),
    findRoutineByStepId: jest.fn(),
    findProductsByIds: jest.fn(),
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

function makeRoutine(overrides: Partial<RoutineRow> = {}): RoutineRow {
  return {
    id: overrides.id ?? 'routine-1',
    user_id: overrides.user_id ?? 'user-1',
    assigned_by: overrides.assigned_by ?? null,
    name: overrides.name ?? 'Rutina diaria',
    description: overrides.description ?? null,
    time_of_day: overrides.time_of_day ?? null,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z'
  };
}

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

describe('routinesService - ownership de rutinas y pasos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('impide que el especialista edite una rutina que no asigno', async () => {
    mockedRepo.findRawById.mockResolvedValue(makeRoutine({
      id: 'routine-1',
      user_id: 'client-1',
      assigned_by: 'specialist-2'
    }));

    await expect(
      routinesService.updateRoutine('routine-1', 'specialist-1', 'specialist', { name: 'Nueva' })
    ).rejects.toMatchObject({
      statusCode: 403
    });

    expect(mockedRepo.update).not.toHaveBeenCalled();
  });

  it('impide que el cliente edite una rutina asignada por especialista', async () => {
    mockedRepo.findRawById.mockResolvedValue(makeRoutine({
      id: 'routine-1',
      user_id: 'client-1',
      assigned_by: 'specialist-1'
    }));

    await expect(
      routinesService.updateRoutine('routine-1', 'client-1', 'user', { name: 'Nueva' })
    ).rejects.toMatchObject({
      statusCode: 403
    });

    expect(mockedRepo.update).not.toHaveBeenCalled();
  });

  it('impide que el cliente elimine una rutina asignada por especialista', async () => {
    mockedRepo.findRawById.mockResolvedValue(makeRoutine({
      id: 'routine-1',
      user_id: 'client-1',
      assigned_by: 'specialist-1'
    }));

    await expect(
      routinesService.deleteRoutine('routine-1', 'client-1', 'user')
    ).rejects.toMatchObject({
      statusCode: 403
    });

    expect(mockedRepo.remove).not.toHaveBeenCalled();
  });

  it('permite que el especialista edite una rutina que asigno', async () => {
    const routine = makeRoutine({
      id: 'routine-1',
      user_id: 'client-1',
      assigned_by: 'specialist-1'
    });
    mockedRepo.findRawById.mockResolvedValue(routine);
    mockedRepo.update.mockResolvedValue({ ...routine, name: 'Nueva' });

    const result = await routinesService.updateRoutine('routine-1', 'specialist-1', 'specialist', { name: 'Nueva' });

    expect(mockedRepo.update).toHaveBeenCalledWith('routine-1', expect.objectContaining({ name: 'Nueva' }));
    expect(result?.name).toBe('Nueva');
  });

  it('impide modificar un step ajeno aunque se conozca el id', async () => {
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine({
      id: 'routine-1',
      user_id: 'owner-1',
      assigned_by: null
    }));

    await expect(
      routinesService.updateStep('step-1', 'user-1', 'user', { name: 'Paso ajeno' })
    ).rejects.toMatchObject({
      statusCode: 404
    });

    expect(mockedRepo.updateStep).not.toHaveBeenCalled();
  });

  it('valida ownership de productos antes de asociarlos a un step', async () => {
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine({
      id: 'routine-1',
      user_id: 'user-1',
      assigned_by: null
    }));
    mockedRepo.findProductsByIds.mockResolvedValue([makeProduct({ id: 'p-1', user_id: 'other-user' })]);

    await expect(
      routinesService.setStepProducts('step-1', 'user-1', 'user', ['p-1'])
    ).rejects.toMatchObject({
      statusCode: 403
    });

    expect(mockedRepo.setStepProducts).not.toHaveBeenCalled();
  });
});

describe('routinesService - productos de pasos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve los productos de un paso accesible', async () => {
    const products = [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2', name: 'Tonico' })];
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine());
    mockedRepo.findProductsByStepId.mockResolvedValue(products);

    const result = await routinesService.getProductsByStep('step-1', 'user-1', 'user');

    expect(mockedRepo.findProductsByStepId).toHaveBeenCalledWith('step-1');
    expect(result).toEqual(products);
  });

  it('reemplaza productos cuando pertenecen al dueno de la rutina', async () => {
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine({ user_id: 'user-1' }));
    mockedRepo.findProductsByIds.mockResolvedValue([
      makeProduct({ id: 'p-1', user_id: 'user-1' }),
      makeProduct({ id: 'p-2', user_id: 'user-1' })
    ]);
    mockedRepo.setStepProducts.mockResolvedValue(undefined);

    await routinesService.setStepProducts('step-1', 'user-1', 'user', ['p-1', 'p-2']);

    expect(mockedRepo.setStepProducts).toHaveBeenCalledWith('step-1', ['p-1', 'p-2']);
  });

  it('permite al especialista usar productos propios en una rutina que asigno', async () => {
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine({
      user_id: 'client-1',
      assigned_by: 'specialist-1'
    }));
    mockedRepo.findProductsByIds.mockResolvedValue([makeProduct({ id: 'p-1', user_id: 'specialist-1' })]);
    mockedRepo.setStepProducts.mockResolvedValue(undefined);

    await routinesService.setStepProducts('step-1', 'specialist-1', 'specialist', ['p-1']);

    expect(mockedRepo.setStepProducts).toHaveBeenCalledWith('step-1', ['p-1']);
  });

  it('asocia un producto a un paso accesible', async () => {
    const stepProduct = makeStepProduct('step-1', 'p-1');
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine());
    mockedRepo.findProductsByIds.mockResolvedValue([makeProduct({ id: 'p-1', user_id: 'user-1' })]);
    mockedRepo.attachProductToStep.mockResolvedValue(stepProduct);

    const result = await routinesService.attachProductToStep('step-1', 'user-1', 'user', 'p-1');

    expect(mockedRepo.attachProductToStep).toHaveBeenCalledWith('step-1', 'p-1');
    expect(result).toEqual(stepProduct);
  });

  it('desasocia un producto de un paso accesible', async () => {
    mockedRepo.findRoutineByStepId.mockResolvedValue(makeRoutine());
    mockedRepo.detachProductFromStep.mockResolvedValue(true);

    const result = await routinesService.detachProductFromStep('step-1', 'user-1', 'user', 'p-1');

    expect(mockedRepo.detachProductFromStep).toHaveBeenCalledWith('step-1', 'p-1');
    expect(result).toBe(true);
  });
});
