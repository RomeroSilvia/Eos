export const colors = {
  background: '#F8F9F9',
  surface: '#FFFFFF',
  surfaceSoft: '#C5E3D1',

  primary: '#A9DFBF',
  primaryDark: '#6A856B',
  primaryLight: '#CCE3D3',
  primarySuperLight: '#EAF0EC',

  secondary: '#C98F90',
  secondaryLight: '#E7B9BB',

  textPrimary: '#011638',
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
