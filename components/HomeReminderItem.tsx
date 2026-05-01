import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { Reminder } from '@/types/reminder';

type HomeReminderItemProps = {
  reminder: Reminder;
};

export function HomeReminderItem({ reminder }: HomeReminderItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.icon}>
        <Ionicons color={colors.secondary} name="notifications-outline" size={20} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{reminder.title}</Text>
        <Text style={styles.time}>{reminder.time}</Text>
      </View>
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
  content: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  time: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  }
});
