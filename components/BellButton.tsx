import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { useHasUnreadNotifications } from '@/hooks/useHasUnreadNotifications';

type Props = {
  style?: ViewStyle;
};

export function BellButton({ style }: Props) {
  const hasUnread = useHasUnreadNotifications();

  return (
    <Pressable onPress={() => router.push('/notifications')} style={[styles.button, style]}>
      <Ionicons color={colors.textPrimary} name="notifications-outline" size={24} />
      {hasUnread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
    position: 'relative'
  },
  dot: {
    backgroundColor: colors.secondaryDark,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 2,
    top: 2,
    width: 10
  }
});
