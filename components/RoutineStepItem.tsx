import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type Props = {
  index: number;
  title: string;
  product?: string;
  onPress?: () => void;
  onDelete?: () => void;
};

export function RoutineStepItem({ index, title, product, onPress, onDelete }: Props) {
  const Content = onPress ? Pressable : View;

  return (
    <View style={styles.row}>
      <Content
        onPress={onPress}
        style={({ pressed }) =>
          onPress
            ? [styles.contentContainer, { opacity: pressed ? 0.6 : 1 }]
            : styles.contentContainer
        }
      >
        <MaterialCommunityIcons name="drag" size={18} color={colors.textSecondary} />

        <View style={styles.circle}>
          <Text style={styles.number}>{index}</Text>
        </View>

        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {product && <Text style={styles.product}>{product}</Text>}
        </View>
      </Content>

      <View style={styles.rightSide}>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Eliminar paso">
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
          </Pressable>
        ) : (
          <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textSecondary} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySuperLight
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rightSide: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: 2
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