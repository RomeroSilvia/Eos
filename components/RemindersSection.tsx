import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { HomeReminderItem } from '@/components/HomeReminderItem';
import { colors } from '@/constants/colors';
import { getRoutines } from '@/services/routines';
import type { Reminder } from '@/types/reminder';
import type { Routine } from '@/types/routine';

function routineToReminder(routine: Routine): Reminder {
  const time =
    routine.time_of_day === 'morning'
      ? '08:00 hs'
      : routine.time_of_day === 'night'
        ? '21:00 hs'
        : '';

  return {
    id: routine.id,
    title: routine.name,
    time,
    enabled: true,
    timeOfDay: routine.time_of_day ?? undefined
  };
}

export function RemindersSection() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    getRoutines()
      .then((routines) => {
        const active = routines
          .filter((r) => r.is_active)
          .map(routineToReminder);
        setReminders(active);
      })
      .catch(() => setReminders([]));
  }, []);

  return (
    <View>
      
      <Card style={styles.card}>
        <Text style={styles.title}>Recordatorios</Text>
        {reminders.length === 0 ? (
          <Text style={styles.empty}>No tenés rutinas activas.</Text>
        ) : (
          reminders.map((reminder, index) => (
            <View key={reminder.id}>
              {index > 0 && <View style={styles.separator} />}
              <HomeReminderItem reminder={reminder} onPress={() => router.push('/routine')} />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 10
  },
  card: {
    paddingVertical: 4
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: 4
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 8
  }
});
