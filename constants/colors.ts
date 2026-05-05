export const colors = {
  primary: '#C98F90',
  primaryDark: '#9F5F61',
  primaryLight: '#E7C8C9',
  primarySuperLight: '#F7ECEC',
  secondary: '#A9DFBF',
  secondaryDark: '#4F9368',
  secondaryLight: '#D7F0E1',
  secondarySoft: '#EEF9F2',
  background: '#F8F9F9',
  surface: '#FFFFFF',
  surfaceSoft: '#F1F5F4',
  border: '#DCE5E2',
  text: '#2C3E50',
  textPrimary: '#20323F',
  textSecondary: '#60717B',
  textMuted: '#8A9AA3',
  pending: '#E9C46A',
  warning: '#F4A261',
  error: '#D9534F',
} as const;

export type ColorName = keyof typeof colors;
