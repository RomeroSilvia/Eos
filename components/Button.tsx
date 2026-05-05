import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}>;

export function Button({
  children,
  disabled = false,
  onPress,
  variant = 'primary',
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  ghost: {
    backgroundColor: colors.surfaceSoft,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  ghostLabel: {
    color: colors.primaryDark,
  },
});
