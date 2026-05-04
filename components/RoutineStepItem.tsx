import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type Props = {
  index: number;
  title: string;
  product?: string;
};

export function RoutineStepItem({ index, title, product }: Props) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name="drag" size={18} color={colors.textSecondary} />

      <View style={styles.circle}>
        <Text style={styles.number}>{index}</Text>
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {product && <Text style={styles.product}>{product}</Text>}
      </View>

      <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySuperLight
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },

  number: {
    color: colors.primaryDark,
    fontWeight: '700'
  },

  text: {
    flex: 1,
    minWidth: 0
  },

  title: {
    fontWeight: '700',
    color: colors.textPrimary
  },

  product: {
    fontSize: 12,
    color: colors.textSecondary
  }
});