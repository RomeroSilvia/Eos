import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

type ProgressStateCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  iconColor?: string;
};

export function ProgressStateCard({ icon, title, text, iconColor = colors.primary }: ProgressStateCardProps) {
  return (
    <View style={styles.card}>
      <Ionicons color={iconColor} name={icon} size={32} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center'
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center'
  }
});
