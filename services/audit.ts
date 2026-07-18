import { ApiRequestError, apiRequest } from '@/services/api/client';
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit/api]', {
        status: error.status,
        body: error.body
      });
    }

    if (error.message && !hasTechnicalDetails(error.message)) {
      return error.message;
    }

    return getAuditLogFriendlyMessage(error.status);
  }

  if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
    console.warn('[audit/api]', error.message);
  }

  return 'Ocurrió un error. Intentá nuevamente.';
}

function getAuditLogFriendlyMessage(status: number): string {
  if (status === 400) return 'Revisá los filtros ingresados.';
  if (status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente.';
  if (status === 403) return 'No tenés permisos para ver el registro de auditoría.';
  return 'No pudimos cargar el registro de auditoría. Intentá nuevamente.';
}

function hasTechnicalDetails(message: string): boolean {
  const normalized = message.toLowerCase();

  return ['stack', 'sql', 'supabase', 'storage.objects', 'exception', 'trace', 'error:'].some((pattern) =>
    normalized.includes(pattern)
  );
}
