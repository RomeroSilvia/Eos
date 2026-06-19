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
  dniPhoto: SpecialistDocument;
  titlePhoto: SpecialistDocument;
  expiresIn: number;
};

export type SpecialistDocument = {
  available: boolean;
  url: string | null;
  errorMessage: string | null;
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
  if (error instanceof ApiRequestError) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[admin/api]', {
        status: error.status,
        body: error.body
      });
    }

    return getAdminFriendlyMessage(error.status);
  }

  if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
    console.warn('[admin/api]', error.message);
  }

  return 'Ocurrió un error. Intentá nuevamente.';
}

function getAdminFriendlyMessage(status: number): string {
  if (status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente.';
  if (status === 403) return 'No tenés permisos para realizar esta acción.';
  if (status === 404) return 'No se encontró la solicitud.';
  if (status === 409) return 'La solicitud ya fue procesada.';
  return 'Ocurrió un error. Intentá nuevamente.';
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
