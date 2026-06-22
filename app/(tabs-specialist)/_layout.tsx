import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingActionMenu } from '@/components/FloatingActionMenu';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { prepareSupabaseRealtimeClient } from '@/services/supabase';
import { getMyPatients, getSpecialistStatus } from '@/services/specialist';

const TAB_BAR_CONTENT_HEIGHT = 56;

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName, focusedName: TabIconName) {
  function TabBarIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
    return <Ionicons color={color} name={focused ? focusedName : name} size={size} />;
  }

  return TabBarIcon;
}

function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export default function SpecialistTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { isLoading: isProfileLoading, profile } = useProfile();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [unreadConsultationsCount, setUnreadConsultationsCount] = useState(0);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const activeRoute = segments[segments.length - 1];
  const showFloatingActionMenu = activeRoute !== 'pacientes';

  useEffect(() => {
    let isActive = true;

    async function checkAccess() {
      setIsCheckingAccess(true);

      try {
        if (isProfileLoading) {
          return;
        }

        if (!profile) {
          router.replace('/landing' as never);
          return;
        }

        if (profile.role === 'center_admin') {
          router.replace('/(tabs-admin)' as never);
          return;
        }

        if (profile.role !== 'specialist') {
          router.replace('/(tabs)/home');
          return;
        }

        const status = await getSpecialistStatus();

        if (status?.license_status !== 'verified') {
          router.replace('/specialist-status' as never);
          return;
        }

        if (isActive) {
          setIsCheckingAccess(false);
        }
      } catch {
        router.replace('/specialist-status' as never);
      }
    }

    void checkAccess();

    return () => {
      isActive = false;
    };
  }, [isProfileLoading, profile, router]);

  const refreshUnreadConsultations = useCallback(async () => {
    if (isProfileLoading || profile?.role !== 'specialist') {
      setUnreadConsultationsCount(0);
      return;
    }

    try {
      const patients = await getMyPatients();
      setUnreadConsultationsCount(
        patients.reduce((total, patient) => total + (patient.status === 'active' ? patient.unreadCount ?? 0 : 0), 0)
      );
    } catch {
      setUnreadConsultationsCount(0);
    }
  }, [isProfileLoading, profile?.role]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadConsultations();
    }, [refreshUnreadConsultations])
  );

  useEffect(() => {
    if (isProfileLoading || profile?.role !== 'specialist' || !profile.id) {
      return;
    }

    let channel: RealtimeChannel | null = null;
    let isMounted = true;

    void (async () => {
      const supabase = await prepareSupabaseRealtimeClient();

      if (!supabase || !isMounted) {
        return;
      }

      channel = supabase
        .channel(`specialist-unread:${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            void refreshUnreadConsultations();
          }
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;

      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [isProfileLoading, profile?.id, profile?.role, refreshUnreadConsultations]);

  if (isCheckingAccess) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 12, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Verificando acceso...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700'
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom + 6,
            paddingTop: 8
          }
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon('home-outline', 'home') }} />
        <Tabs.Screen
          name="consultas"
          options={{
            title: 'Consultas',
            tabBarBadge: unreadConsultationsCount > 0 ? formatBadgeCount(unreadConsultationsCount) : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.secondary,
              color: colors.surface,
              fontSize: 10,
              fontWeight: '900'
            },
            tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles')
          }}
        />
        <Tabs.Screen
          name="pacientes"
          options={{ title: 'Pacientes', tabBarIcon: tabIcon('people-outline', 'people') }}
        />
        <Tabs.Screen
          name="rutinas"
          options={{ title: 'Rutinas', tabBarIcon: tabIcon('list-outline', 'list') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Perfil', tabBarIcon: tabIcon('person-outline', 'person') }}
        />
      </Tabs>
      {showFloatingActionMenu ? (
        <FloatingActionMenu
          productRoute={{
            pathname: '/products/create',
            params: { returnTo: 'specialist-products' }
          }}
          routineRoute="/routine/Create"
          tabBarHeight={tabBarHeight}
        />
      ) : null}
    </View>
  );
}
