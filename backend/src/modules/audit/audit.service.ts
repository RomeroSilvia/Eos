import { supabase } from '../../config/supabase';
import type { RecordAuditLogParams } from './audit.types';

/**
 * M4 contract: best-effort audit logging.
 * Never throw to avoid blocking primary business flows.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    const db = supabase as any;
    const payload = {
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? null
    };

    const { error } = await db.from('audit_logs').insert(payload);

    if (error) {
      // Best-effort by contract. Keep a debug trace in non-production only.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[audit] No se pudo registrar evento', {
          message: error.message,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit] Error inesperado al registrar evento', error);
    }
  }
}
