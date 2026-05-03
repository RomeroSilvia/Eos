import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle; 
}>;

export function Button({ children, onPress, variant = 'primary', style, textStyle }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.secondary
  },
  ghost: {
    backgroundColor: colors.surfaceSoft
  },
  pressed: {
    opacity: 0.82
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700'
  },
  ghostLabel: {
    color: colors.primaryDark
  }
});
