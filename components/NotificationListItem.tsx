import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { AppNotification, AppNotificationKind } from '@/types/notification';

type NotificationListItemProps = {
  notification: AppNotification;
  onPress?: () => void;
};

const ICON_BY_KIND: Record<AppNotificationKind, keyof typeof Ionicons.glyphMap> = {
  streak: 'flame',
  'routine-morning': 'sunny',
  'routine-evening': 'moon',
  'product-reminder': 'flask-outline'
};

const BACKGROUND_BY_KIND: Record<AppNotificationKind, string> = {
  streak: colors.primary,
  'routine-morning': colors.secondary,
  'routine-evening': colors.primary,
  'product-reminder': colors.secondary
};

export function NotificationListItem({ notification, onPress }: NotificationListItemProps) {
  return (
    <Pressable
      onPress={notification.isRead ? undefined : onPress}
      style={({ pressed }) => [
        styles.item,
        !notification.isRead && styles.itemUnread,
        pressed && !notification.isRead && styles.itemPressed
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: BACKGROUND_BY_KIND[notification.kind] }]}>
        <Ionicons color={colors.surface} name={ICON_BY_KIND[notification.kind]} size={20} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    padding: 16
  },
  itemUnread: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight
  },
  itemPressed: {
    opacity: 0.7
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  textContainer: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19
  }
});
