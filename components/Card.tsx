import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

type CardProps = PropsWithChildren<{
  variant?: 'default' | 'soft';
  style?: ViewStyle;
}>;

export function Card({ children, variant = 'default', style }: CardProps) {
  return <View style={[styles.card, variant === 'soft' && styles.soft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight
  }
});
