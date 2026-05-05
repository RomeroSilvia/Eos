export const colors = {
  background: '#F8F9F9',
  surface: '#FFFFFF',
  surfaceSoft: '#EEF5EF',
  routineCircleSoft: '#DFEADF',
  primary: '#6F8F72',
  primaryDark: '#4F6F52',
  primaryLight: '#DDEADD',
  secondary: '#D98282',
  secondaryDark: '#B25C5C',
  secondaryLight: '#F3D6D6',
  secondarySoft: '#f5e5e5',
  textPrimary: '#102A43',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textSecondaryLight: '#D1D5DB',

  border: '#E1E6E2',

  error: '#BA2A06',
  success: '#A9DFBF',
  pending: '#E1E6E2',

  warning: '#F2C94C'
} as const;

export type ColorName = keyof typeof colors;
