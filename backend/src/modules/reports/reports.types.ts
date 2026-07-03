export type AdminReportFilters = {
  centerId?: string;
  from?: string;
  to?: string;
};

export type CenterMetricSummary = {
  centerId: string;
  centerName: string;
  clients: number;
  specialists: number;
  consultations: number;
  assignedRoutines: number;
  averageCompliance: number;
};

export type GlobalReportSummary = {
  clients: number;
  activeSpecialists: number;
  consultations: number;
  assignedRoutines: number;
  averageCompliance: number;
};

export type AdminReportsResponse = {
  filters: {
    centerId: string | null;
    from: string | null;
    to: string | null;
  };
  summary: GlobalReportSummary;
  byCenter: CenterMetricSummary[];
  scopeWarning: string | null;
};
