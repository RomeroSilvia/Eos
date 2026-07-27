export type { CenterRow, CenterAdminRow } from '../../database/schema.types';

/**
 * Referencia liviana a un centro (sin specialistsCount/fechas), usada al
 * embeber el centro dentro de respuestas de otros dominios (ej. perfil de
 * especialista). Para el listado/CRUD propio de centros usar CenterSummary.
 */
export type CenterReference = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  imageUrl: string | null;
};

export type CenterSummary = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  imageUrl: string | null;
  isActive: boolean;
  specialistsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CenterDashboardSummary = {
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
};

export type CreateCenterInput = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  city?: unknown;
  province?: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
};

export type UpdateCenterInput = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  city?: unknown;
  province?: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
};

export type CenterSpecialistSummary = {
  specialistProfileId: string;
  userId: string;
  name: string | null;
  email: string | null;
  specialty: string;
  licenseStatus: string;
  centerId: string | null;
};
