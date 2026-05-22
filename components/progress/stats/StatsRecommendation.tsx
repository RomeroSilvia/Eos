import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { statsStyles as styles } from './stats.styles';

type StatsRecommendationProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export function StatsRecommendation({ icon, text }: StatsRecommendationProps) {
  return (
    <View style={styles.recommendation}>
      <Ionicons color={colors.primaryDark} name={icon} size={22} />
      <Text style={styles.recommendationText}>{text}</Text>
    </View>
  );
}
