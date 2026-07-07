import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { reportsService } from './reports.service';

export const getAdminReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await reportsService.getAdminReports({
    centerId: typeof req.query.centerId === 'string' ? req.query.centerId : undefined,
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined
  });

  res.json(reports);
});
