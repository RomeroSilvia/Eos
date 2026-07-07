import { ApiError } from '../../utils/ApiError';
import { reportsRepository } from './reports.repository';
import type { AdminReportFilters, AdminReportsResponse } from './reports.types';

export const reportsService = {
  async getAdminReports(filters: AdminReportFilters): Promise<AdminReportsResponse> {
    const parsedFilters = parseFilters(filters);

    const [{ summary, scopeWarning }, byCenter] = await Promise.all([
      reportsRepository.getSummary(parsedFilters),
      reportsRepository.getCenterBreakdown(parsedFilters)
    ]);

    return {
      filters: {
        centerId: parsedFilters.centerId ?? null,
        from: parsedFilters.from ?? null,
        to: parsedFilters.to ?? null
      },
      summary: {
        clients: summary.clients,
        activeSpecialists: summary.specialists,
        consultations: summary.consultations,
        assignedRoutines: summary.assignedRoutines,
        averageCompliance: summary.averageCompliance
      },
      byCenter,
      scopeWarning
    };
  }
};

function parseFilters(filters: AdminReportFilters): AdminReportFilters {
  const centerId = filters.centerId?.trim();
  const from = filters.from?.trim();
  const to = filters.to?.trim();

  if (from && Number.isNaN(Date.parse(from))) {
    throw new ApiError(400, 'Parametro from invalido. Usa ISO date.');
  }

  if (to && Number.isNaN(Date.parse(to))) {
    throw new ApiError(400, 'Parametro to invalido. Usa ISO date.');
  }

  if (from && to && Date.parse(from) > Date.parse(to)) {
    throw new ApiError(400, 'El rango de fechas es invalido: from no puede ser mayor que to.');
  }

  return {
    centerId: centerId || undefined,
    from: from || undefined,
    to: to || undefined
  };
}
