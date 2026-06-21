import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { AppNotification, AppNotificationKind } from '@/types/notification';

type NotificationListItemProps = {
  notification: AppNotification;
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

export function NotificationListItem({ notification }: NotificationListItemProps) {
  return (
    <View style={[styles.item, !notification.isRead && styles.itemUnread]}>
      <View style={[styles.iconCircle, { backgroundColor: BACKGROUND_BY_KIND[notification.kind] }]}>
        <Ionicons color={colors.surface} name={ICON_BY_KIND[notification.kind]} size={20} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
      </View>
    </View>
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
