import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getAuditLogs as getAuditLogsService } from './audit.service';

export const getAuditLogs: RequestHandler = asyncHandler(async (req, res) => {
  const logs = await getAuditLogsService({
    entity: getStringQueryParam(req.query.entity),
    entityId: getStringQueryParam(req.query.entityId),
    actorId: getStringQueryParam(req.query.actorId),
    from: getStringQueryParam(req.query.from),
    to: getStringQueryParam(req.query.to),
    page: getStringQueryParam(req.query.page),
    limit: getStringQueryParam(req.query.limit)
  });

  res.json(logs);
});

function getStringQueryParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
