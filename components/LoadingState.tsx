import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

type LoadingStateProps = {
  message?: string;
  variant?: 'box' | 'inline';
};

export function LoadingState({ message = 'Cargando...', variant = 'box' }: LoadingStateProps) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="progressbar" style={variant === 'box' ? styles.box : styles.inline}>
      <ActivityIndicator color={colors.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 22
  },
  inline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 44
  },
  text: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  }
});
