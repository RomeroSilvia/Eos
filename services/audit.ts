import { ApiRequestError, apiRequest, getFriendlyErrorMessage } from '@/services/api/client';
import type { AuditLogFilters, AuditLogPage } from '@/types/audit';

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  const params = new URLSearchParams();

  if (filters.entity) params.set('entity', filters.entity);
  if (filters.actorName) params.set('actorName', filters.actorName);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', String(filters.page));

  const query = params.toString();

  return apiRequest<AuditLogPage>({
    path: query ? `/admin/audit-log?${query}` : '/admin/audit-log',
    method: 'GET'
  });
}

export function getAuditLogErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (__DEV__) {
      console.warn('[audit/api]', {
        status: error.status,
        body: error.body
      });
    }

    if (error.status === 400) return 'Revisá los filtros ingresados.';
    if (error.status === 403) return 'No tenés permisos para ver el registro de auditoría.';
  } else if (__DEV__ && error instanceof Error) {
    console.warn('[audit/api]', error.message);
  }

  return getFriendlyErrorMessage(error, 'No pudimos cargar el registro de auditoría. Intentá nuevamente.');
}
