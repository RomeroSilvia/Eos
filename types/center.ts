export type Center = {
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

export type CenterPayload = {
  name: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  imageUrl?: string | null;
};

export type CenterSpecialist = {
  specialistProfileId: string;
  userId: string;
  name: string | null;
  email: string | null;
  specialty: string;
  licenseStatus: string;
  centerId: string | null;
};

export type CenterDashboard = {
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
};
