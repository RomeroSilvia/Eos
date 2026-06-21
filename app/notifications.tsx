import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationListItem } from '@/components/NotificationListItem';
import { colors } from '@/constants/colors';
import { getNotifications, markNotificationRead } from '@/services/notifications';
import { invalidateUnreadCache } from '@/hooks/useHasUnreadNotifications';
import type { AppNotification } from '@/types/notification';
import { isToday, isYesterday } from '@/utils/date';

type NotificationTab = 'all' | 'unread';


function groupByDay(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups = new Map<string, AppNotification[]>();

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const label = isToday(date) ? 'Hoy' : isYesterday(date) ? 'Ayer' : date.toLocaleDateString('es-AR');
    const existing = groups.get(label) ?? [];
    existing.push(notification);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      getNotifications().then(setNotifications).catch(() => setNotifications([]));
      return () => { invalidateUnreadCache(); };
    }, [])
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    void markNotificationRead(id);
    invalidateUnreadCache();
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  const visibleNotifications = useMemo(
    () => (activeTab === 'unread' ? notifications.filter((item) => !item.isRead) : notifications),
    [activeTab, notifications]
  );

  const groups = useMemo(() => groupByDay(visibleNotifications), [visibleNotifications]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <Pressable onPress={() => router.back()} style={styles.bellButton}>
          <Ionicons color={colors.textPrimary} name="notifications-outline" size={26} />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setActiveTab('all')} style={styles.tabButton}>
          <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>Todas</Text>
          {activeTab === 'all' && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable onPress={() => setActiveTab('unread')} style={styles.tabButton}>
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabLabel, activeTab === 'unread' && styles.tabLabelActive]}>No leídas</Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {activeTab === 'unread' && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onPress={() => markAsRead(notification.id)}
              />
            ))}
          </View>
        ))}

        {groups.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons color={colors.textMuted} name="notifications-off-outline" size={32} />
            <Text style={styles.emptyText}>No tenés notificaciones sin leer</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800'
  },
  bellButton: {
    padding: 6,
    position: 'relative'
  },
  bellDot: {
    backgroundColor: colors.secondaryDark,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 4,
    top: 4,
    width: 10
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 28,
    marginTop: 18,
    paddingHorizontal: 20
  },
  tabButton: {
    paddingBottom: 12
  },
  tabLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: colors.secondaryDark,
    fontWeight: '700'
  },
  tabUnderline: {
    backgroundColor: colors.secondaryDark,
    borderRadius: 2,
    bottom: -1,
    height: 2,
    position: 'absolute',
    width: '100%'
  },
  tabBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondaryDark,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4
  },
  tabBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700'
  },
  list: {
    padding: 20
  },
  group: {
    marginBottom: 8
  },
  groupLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 60
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14
  }
});
