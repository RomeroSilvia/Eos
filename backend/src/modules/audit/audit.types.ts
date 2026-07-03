export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'login'
  | 'role_change';

export type AuditEntity =
  | 'routine'
  | 'specialist_profile'
  | 'center'
  | 'subscription'
  | 'product'
  | 'user_profile';

export type RecordAuditLogParams = {
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
};
