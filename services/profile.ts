import { apiRequest } from '@/services/api/client';
import { getCurrentProfile, updateStoredProfile } from '@/services/auth';
import type { UserProfile } from '@/types/user';

type ProfileResponse = {
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
    skin_type: string | null;
  };
};

export async function updateProfile(data: { fullName: string }): Promise<UserProfile> {
  const response = await apiRequest<ProfileResponse>({
    path: '/profile',
    method: 'PATCH',
    body: JSON.stringify({ fullName: data.fullName })
  });

  const currentProfile = await getCurrentProfile();
  const nextProfile: UserProfile = {
    ...currentProfile,
    id: response.profile.id,
    name: response.profile.full_name,
    email: response.profile.email ?? currentProfile.email,
    role: response.profile.role as UserProfile['role'],
    skinType: (response.profile.skin_type ?? currentProfile.skinType) as UserProfile['skinType']
  };

  await updateStoredProfile(nextProfile);
  return nextProfile;
}
