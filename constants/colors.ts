export const colors = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceSoft: '#EEF5EF',
  primary: '#6F8F72',
  primaryDark: '#4F6F52',
  primaryLight: '#DDEADD',
  secondary: '#D98282',
  secondaryLight: '#F3D6D6',
  textPrimary: '#102A43',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  error: '#D9534F',
  success: '#6F8F72',
  pending: '#E8F0FE',
  warning: '#F2C94C'
} as const;

export type ColorName = keyof typeof colors;
