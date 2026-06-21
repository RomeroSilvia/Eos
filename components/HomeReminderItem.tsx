import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { Reminder } from '@/types/reminder';

type HomeReminderItemProps = {
  reminder: Reminder;
  onToggle?: (reminderId: string) => void;
};

function getIcon(timeOfDay?: string): 'sunny-outline' | 'moon-outline' | 'notifications-outline' {
  if (timeOfDay === 'morning') return 'sunny-outline';
  if (timeOfDay === 'night') return 'moon-outline';
  return 'notifications-outline';
}

export function HomeReminderItem({ reminder, onToggle }: HomeReminderItemProps) {
  const iconName = getIcon(reminder.timeOfDay);

  return (
    <View style={styles.item}>
      <View style={styles.icon}>
        <Ionicons color={colors.textSecondary} name={iconName} size={20} />
      </View>
      <Text style={styles.title}>{reminder.title}</Text>
      {reminder.time ? (
        <Pressable
          onPress={() => onToggle?.(reminder.id)}
          style={styles.timeBadge}
        >
          <Text style={styles.timeText}>{reminder.time}</Text>
        </Pressable>
      ) : null}
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
    backgroundColor: colors.border,
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
    fontWeight: '600'
  }
});
