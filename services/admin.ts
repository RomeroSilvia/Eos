import { ApiRequestError, apiRequest } from '@/services/api/client';

export type PendingSpecialist = {
  specialistProfileId: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  specialty: 'dermatologo' | 'cosmetologo' | string;
  licenseNumber: string;
  licenseStatus: 'pending' | 'verified' | 'rejected' | string;
  rejectionReason: string | null;
  createdAt: string | null;
};

type PendingSpecialistsResponse = {
  specialists: PendingSpecialist[];
};

type UpdateSpecialistStatusResponse = {
  specialist: PendingSpecialist;
};

export type SpecialistDocuments = {
  dniPhotoUrl: string | null;
  titlePhotoUrl: string | null;
  expiresIn: number;
};

type SpecialistDocumentsResponse = {
  documents: SpecialistDocuments;
};

export async function getPendingSpecialists(): Promise<PendingSpecialist[]> {
  const response = await apiRequest<PendingSpecialistsResponse>({
    path: '/admin/specialists/pending',
    method: 'GET'
  });

  return response.specialists;
}

export async function getSpecialistDocuments(specialistProfileId: string): Promise<SpecialistDocuments> {
  const response = await apiRequest<SpecialistDocumentsResponse>({
    path: `/admin/specialists/${specialistProfileId}/documents`,
    method: 'GET'
  });

  return response.documents;
}

export async function approveSpecialist(specialistProfileId: string): Promise<PendingSpecialist> {
  return updateSpecialistStatus(specialistProfileId, { licenseStatus: 'verified' });
}

export async function rejectSpecialist(
  specialistProfileId: string,
  rejectionReason: string
): Promise<PendingSpecialist> {
  return updateSpecialistStatus(specialistProfileId, {
    licenseStatus: 'rejected',
    rejectionReason
  });
}

export function getAdminErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 403) {
    return 'No tenés permisos para acceder a esta sección';
  }

  if (error instanceof ApiRequestError) {
    const body = error.body as { message?: string } | null;
    return body?.message ?? 'No pudimos completar la operación.';
  }

  return error instanceof Error ? error.message : 'No pudimos conectar con el backend.';
}

async function updateSpecialistStatus(
  specialistProfileId: string,
  body: { licenseStatus: 'verified' | 'rejected'; rejectionReason?: string }
): Promise<PendingSpecialist> {
  const response = await apiRequest<UpdateSpecialistStatusResponse>({
    path: `/admin/specialists/${specialistProfileId}/status`,
    method: 'PATCH',
    body: JSON.stringify(body)
  });

  return response.specialist;
}
