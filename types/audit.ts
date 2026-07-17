export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'role_change';

export type AuditEntity = 'routine' | 'specialist_profile' | 'center' | 'subscription' | 'product' | 'user_profile';

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string;
  actorProfile: string | null;
  action: AuditAction | string;
  entity: AuditEntity | string;
  entityId: string;
  entityLabel: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogFilters = {
  entity?: AuditEntity;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
};
