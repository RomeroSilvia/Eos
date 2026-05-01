export type UserRole = 'user' | 'specialist' | 'center_admin';

export type SkinType = 'normal' | 'dry' | 'oily' | 'mixed' | 'sensitive';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  skinType: SkinType;
};
