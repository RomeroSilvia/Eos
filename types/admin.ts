export type PendingSpecialist = {
  specialistProfileId: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  specialty: 'dermatologo' | 'cosmetologo' | string;
  licenseNumber: string;
  licenseStatus: 'pending' | 'verified' | 'rejected' | string;
  rejectionReason: string | null;
  centerId: string | null;
  center: {
    id: string;
    name: string;
  } | null;
  createdAt: string | null;
};

export type SpecialistDocument = {
  available: boolean;
  url: string | null;
  errorMessage: string | null;
};

export type SpecialistDocuments = {
  dniPhoto: SpecialistDocument;
  titlePhoto: SpecialistDocument;
  expiresIn: number;
};
