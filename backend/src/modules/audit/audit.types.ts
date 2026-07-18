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
  | 'user_profile'
  | 'skin_profile'
  | 'specialist_relation';

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

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  created_at: string;
};

export type AuditLogFilters = {
  entity?: AuditEntity;
  entityId?: string;
  entityIdIn?: string[];
  actorId?: string;
  actorIdIn?: string[];
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type RoutineStepDetail = {
  category: string | null;
  stepName: string | null;
  hasProducts: boolean;
};

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string;
  actorProfile: string | null;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  routineStepDetails: RoutineStepDetail[] | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
};
