import { ApiRequestError, apiRequest } from '@/services/api/client';

export type Center = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CenterPayload = {
  name: string;
  address?: string | null;
  phone?: string | null;
};

export type CenterDashboard = {
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
};

type CentersResponse = {
  centers: Center[];
};

type CenterResponse = {
  center: Center;
};

export async function getCenters(): Promise<Center[]> {
  const response = await apiRequest<CentersResponse>({
    path: '/centers',
    method: 'GET'
  });

  return response.centers;
}

export async function createCenter(payload: CenterPayload): Promise<Center> {
  const response = await apiRequest<CenterResponse>({
    path: '/centers',
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response.center;
}

export async function updateCenter(centerId: string, payload: CenterPayload): Promise<Center> {
  const response = await apiRequest<CenterResponse>({
    path: `/centers/${centerId}`,
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  return response.center;
}

export async function deleteCenter(centerId: string): Promise<void> {
  await apiRequest<void>({
    path: `/centers/${centerId}`,
    method: 'DELETE'
  });
}

export async function getCenterDashboard(centerId: string): Promise<CenterDashboard> {
  return apiRequest<CenterDashboard>({
    path: `/centers/${centerId}/dashboard`,
    method: 'GET'
  });
}

export function getCentersErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.message && !hasTechnicalDetails(error.message)) {
      return error.message;
    }

    if (error.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
    if (error.status === 403) return 'No tenes permisos para gestionar centros.';
    if (error.status === 404) return 'No encontramos el centro solicitado.';
    if (error.status === 409) return 'Ya existe un centro activo con ese nombre.';
    if (error.status === 500) return 'No pudimos crear el centro. Intentá nuevamente.';
  }

  if (error instanceof Error && !hasTechnicalDetails(error.message)) {
    return error.message;
  }

  return 'Ocurrio un error. Intenta nuevamente.';
}

function hasTechnicalDetails(message: string): boolean {
  const normalized = message.toLowerCase();

  return [
    'stack',
    'sql',
    'supabase',
    'center_admins',
    'centers',
    'trace',
    'exception',
    'error:',
    'unexpected server error'
  ].some((pattern) => normalized.includes(pattern));
}
