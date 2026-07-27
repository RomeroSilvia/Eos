import { ApiRequestError, apiRequest, getFriendlyErrorMessage } from '@/services/api/client';
import type { PendingSpecialist, SpecialistDocuments } from '@/types/admin';

export type { PendingSpecialist, SpecialistDocument, SpecialistDocuments } from '@/types/admin';

type PendingSpecialistsResponse = {
  specialists: PendingSpecialist[];
};

type UpdateSpecialistStatusResponse = {
  specialist: PendingSpecialist;
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

export async function getAdminSpecialists(): Promise<PendingSpecialist[]> {
  const response = await apiRequest<PendingSpecialistsResponse>({
    path: '/admin/specialists',
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

export async function assignSpecialistCenter(
  specialistProfileId: string,
  centerId: string | null
): Promise<PendingSpecialist> {
  const response = await apiRequest<UpdateSpecialistStatusResponse>({
    path: `/admin/specialists/${specialistProfileId}/center`,
    method: 'PATCH',
    body: JSON.stringify({ centerId })
  });

  return response.specialist;
}

export function getAdminErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (__DEV__) {
      console.warn('[admin/api]', {
        status: error.status,
        body: error.body
      });
    }

    if (error.status === 409) {
      return 'La solicitud ya fue procesada.';
    }
  } else if (__DEV__ && error instanceof Error) {
    console.warn('[admin/api]', error.message);
  }

  return getFriendlyErrorMessage(error, 'Ocurrió un error. Intentá nuevamente.');
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
