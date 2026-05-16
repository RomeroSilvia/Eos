import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '@/types/user';

const sessionKey = 'eos-session';

export const mockUserProfile: UserProfile = {
  id: 'user-marta',
  name: 'Marta',
  role: 'user',
  skinType: 'mixed'
};

export async function loginMock(email: string): Promise<UserProfile> {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify({ email, userId: mockUserProfile.id }));
  return { ...mockUserProfile, email };
}

export async function registerMock(email: string): Promise<UserProfile> {
  return loginMock(email);
}

export async function getCurrentProfile(): Promise<UserProfile> {
  return mockUserProfile;
}

export async function logoutMock(): Promise<void> {
  await SecureStore.deleteItemAsync(sessionKey);
}
