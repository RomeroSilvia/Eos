export type SpecialistLicenseStatus =
  | 'pending'
  | 'rejected'
  | 'verified'
  | 'not_submitted'
  | (string & {});
export type SpecialistSpecialty = 'dermatologo' | 'cosmetologo';

export type SpecialistCenter = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
};

export type SpecialistStatus = {
  license_status: SpecialistLicenseStatus;
  rejection_reason: string | null;
  specialty: SpecialistSpecialty | null;
  license_number: string | null;
  full_name: string | null;
  center: SpecialistCenter | null;
} | null;

export type MySpecialist = {
  id: string;
  fullName: string;
  email: string | null;
  specialty: SpecialistSpecialty | null;
  center: SpecialistCenter | null;
};

export type SpecialistDirectoryItem = {
  id: string;
  fullName: string;
  specialty: SpecialistSpecialty;
  center: SpecialistCenter | null;
};

export type PatientRelationStatus = 'active' | 'inactive' | 'pending' | (string & {});

export type PatientSkinProfile = {
  ageRange: string | null;
  mainGoal: string | null;
  imperfections: string | null;
  routineSteps: string | null;
};

export type SpecialistPatient = {
  relationId: string;
  id: string;
  fullName: string;
  email: string | null;
  status: PatientRelationStatus;
  skinType: string | null;
  skinProfile: PatientSkinProfile | null;
  profileImageUrl?: string | null;
  unreadCount?: number;
  lastActivityAt: string | null;
};

export type PatientProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
};

export type PatientRoutineStep = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  order?: number;
  isCompleted?: boolean;
  products: PatientProduct[];
};

export type PatientRoutine = {
  id: string;
  name: string;
  description: string | null;
  timeOfDay: string | null;
  isActive: boolean;
  steps: PatientRoutineStep[];
};

export type PatientRoutineHistoryItem = {
  id: string;
  date: string;
  completedAt: string | null;
  completionPercentage: number;
  routine: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  steps: PatientRoutineStep[];
};

export type SpecialistPatientDetail = SpecialistPatient & {
  routines: PatientRoutine[];
  history: PatientRoutineHistoryItem[];
};
