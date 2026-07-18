import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}>;

export function Button({
  accessibilityLabel,
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primaryDark : colors.surface} size="small" style={styles.spinner} />
      ) : null}
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18
  },
  spinner: {
    marginRight: 10
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
  disabled: {
    opacity: 0.5
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
