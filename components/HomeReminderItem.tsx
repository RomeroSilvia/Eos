import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { Reminder } from '@/types/reminder';

type HomeReminderItemProps = {
  reminder: Reminder;
  onToggle?: (reminderId: string) => void;
};

export function HomeReminderItem({ reminder, onToggle }: HomeReminderItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.icon}>
        <Ionicons color={colors.secondary} name="notifications-outline" size={20} />
      </View>
      <Text style={styles.title}>{reminder.title}</Text>
      <Pressable
        onPress={() => onToggle?.(reminder.id)}
        style={[
          styles.timeBadge,
          { backgroundColor: reminder.enabled ? colors.primary : colors.border }
        ]}
      >
        <Text style={[styles.timeText, { color: reminder.enabled ? colors.surface : colors.textSecondary }]}>
          {reminder.time}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.secondaryLight,
    borderRadius: 16,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '700'
  },
  timeBadge: {
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500'
  }
});
