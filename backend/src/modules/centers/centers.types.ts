export type CenterRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CenterAdminRow = {
  id: string;
  user_id: string;
  center_id: string;
  role: string;
  created_at: string;
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
