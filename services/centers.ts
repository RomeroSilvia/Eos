import { ApiRequestError, apiRequest } from '@/services/api/client';
import { Platform } from 'react-native';

export type Center = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  imageUrl: string | null;
  isActive: boolean;
  specialistsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CenterPayload = {
  name: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  imageUrl?: string | null;
};

export type CenterSpecialist = {
  specialistProfileId: string;
  userId: string;
  name: string | null;
  email: string | null;
  specialty: string;
  licenseStatus: string;
  centerId: string | null;
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

type CenterSpecialistsResponse = {
  specialists: CenterSpecialist[];
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

export async function uploadCenterImage(centerId: string, imageUri: string): Promise<Center> {
  const formData = new FormData();
  await appendImageToFormData(formData, imageUri);

  const response = await apiRequest<CenterResponse>({
    path: `/centers/${centerId}/image`,
    method: 'POST',
    body: formData
  });

  return response.center;
}

export async function getCenterSpecialists(centerId: string): Promise<CenterSpecialist[]> {
  const response = await apiRequest<CenterSpecialistsResponse>({
    path: `/centers/${centerId}/specialists`,
    method: 'GET'
  });

  return response.specialists;
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

export function getUpdateCenterErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return 'No tenes permiso para editar este centro.';
    if (error.status === 404) return 'No encontramos este centro o fue dado de baja.';
    if (error.status === 409) return 'Ya existe un centro activo con ese nombre.';

    if (error.message && !hasTechnicalDetails(error.message)) {
      return error.message;
    }
  }

  return 'No pudimos editar el centro. Intenta nuevamente.';
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

async function appendImageToFormData(formData: FormData, uri: string): Promise<void> {
  const type = getMimeType(uri);
  const name = getFilename(uri);

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('image', new File([blob], name, { type }));
    return;
  }

  formData.append('image', {
    uri,
    type,
    name
  } as unknown as Blob);
}

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function getFilename(uri: string): string {
  const base = uri.split('/').pop() ?? 'center.jpg';
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : 'jpg';
  const normalizedExt = ext === 'jpeg' ? 'jpg' : (['jpg', 'png', 'webp'].includes(ext) ? ext : 'jpg');
  return `center.${normalizedExt}`;
}
