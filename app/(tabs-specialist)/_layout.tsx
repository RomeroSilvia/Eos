import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingActionMenu } from '@/components/FloatingActionMenu';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { getSpecialistStatus } from '@/services/specialist';

const TAB_BAR_CONTENT_HEIGHT = 56;

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName, focusedName: TabIconName) {
  function TabBarIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
    return <Ionicons color={color} name={focused ? focusedName : name} size={size} />;
  }

  return TabBarIcon;
}

export default function SpecialistTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { isLoading: isProfileLoading, profile } = useProfile();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
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
          options={{ title: 'Consultas', tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles') }}
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
