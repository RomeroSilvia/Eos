import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const ACCESS_TOKEN_KEY = 'eos-access-token';

export async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setStoredAccessToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function deleteStoredAccessToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
