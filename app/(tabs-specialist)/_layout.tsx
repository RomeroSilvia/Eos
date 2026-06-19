import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';

const TAB_BAR_CONTENT_HEIGHT = 58;

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
  const { profile } = useProfile();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  useEffect(() => {
    if (profile?.role === 'center_admin') {
      router.replace('/(tabs-admin)' as never);
      return;
    }

    if (profile && profile.role !== 'specialist') {
      router.replace('/(tabs)/home');
    }
  }, [profile, router]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '800'
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
    </View>
  );
}
