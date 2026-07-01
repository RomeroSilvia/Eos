export type CenterRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCenterInput = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
};

export type UpdateCenterInput = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
};
