import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

type AuthLoadingScreenProps = {
  message?: string;
};

export function AuthLoadingScreen({ message = 'Validando sesion...' }: AuthLoadingScreenProps) {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center'
  },
  text: {
    color: colors.textSecondary,
    fontSize: 15
  }
});
