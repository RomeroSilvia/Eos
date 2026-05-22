import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { statsStyles as styles } from './stats.styles';

type StatsHeaderProps = {
  onBack: () => void;
};

export function StatsHeader({ onBack }: StatsHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Volver" onPress={onBack} style={styles.backButton}>
        <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>Tu constancia en el cuidado de la piel</Text>
      </View>
    </View>
  );
}
