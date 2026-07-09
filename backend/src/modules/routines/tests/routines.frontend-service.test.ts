import { apiRequest } from '@/services/api/client';
import {
  createStep,
  deleteStep,
  getStepsByRoutine,
  setStepProducts,
  updateStep
} from '@/services/routines';

jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn()
}));

const mockedApiRequest = jest.mocked(apiRequest);

describe('routines frontend service', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('crea pasos usando el endpoint anidado de rutina', async () => {
    mockedApiRequest.mockResolvedValue({
      id: 'step-1',
      routine_id: 'routine-1',
      name: 'Limpieza'
    });

    await createStep({
      routine_id: 'routine-1',
      name: 'Limpieza',
      description: 'Gel suave',
      category: 'limpieza',
      step_order: 1
    });

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/routine-1/steps',
      method: 'POST',
      body: JSON.stringify({
        name: 'Limpieza',
        description: 'Gel suave',
        category: 'limpieza',
        step_order: 1
      })
    });
  });

  it('lee pasos usando el endpoint anidado de rutina', async () => {
    mockedApiRequest.mockResolvedValue([]);

    await getStepsByRoutine('routine-1');

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/routine-1/steps',
      method: 'GET'
    });
  });

  it('edita pasos usando el endpoint anidado cuando recibe routineId', async () => {
    mockedApiRequest.mockResolvedValue({
      id: 'step-1',
      routine_id: 'routine-1',
      name: 'Limpieza actualizada'
    });

    await updateStep('step-1', { name: 'Limpieza actualizada' }, 'routine-1');

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/routine-1/steps/step-1',
      method: 'PATCH',
      body: JSON.stringify({ name: 'Limpieza actualizada' })
    });
  });

  it('mantiene compatibilidad con el endpoint legacy si no recibe routineId al editar', async () => {
    mockedApiRequest.mockResolvedValue({
      id: 'step-1',
      routine_id: 'routine-1',
      name: 'Limpieza actualizada'
    });

    await updateStep('step-1', { name: 'Limpieza actualizada' });

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/steps/step-1',
      method: 'PATCH',
      body: JSON.stringify({ name: 'Limpieza actualizada' })
    });
  });

  it('elimina pasos usando el endpoint anidado cuando recibe routineId', async () => {
    mockedApiRequest.mockResolvedValue(undefined);

    await deleteStep('step-1', 'routine-1');

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/routine-1/steps/step-1',
      method: 'DELETE'
    });
  });

  it('mantiene compatibilidad con el endpoint legacy si no recibe routineId al eliminar', async () => {
    mockedApiRequest.mockResolvedValue(undefined);

    await deleteStep('step-1');

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/steps/step-1',
      method: 'DELETE'
    });
  });

  it('reemplaza productos del paso usando el endpoint real', async () => {
    mockedApiRequest.mockResolvedValue(undefined);

    await setStepProducts('step-1', ['product-1', 'product-2']);

    expect(mockedApiRequest).toHaveBeenCalledWith({
      path: '/routines/steps/step-1/products',
      method: 'PUT',
      body: JSON.stringify({ product_ids: ['product-1', 'product-2'] })
    });
  });
});
