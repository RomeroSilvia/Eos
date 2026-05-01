import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { FloatingActionMenu } from '@/components/FloatingActionMenu';
import { colors } from '@/constants/colors';

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName, focusedName: TabIconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons color={color} name={focused ? focusedName : name} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="home"
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
            height: 76,
            paddingBottom: 10,
            paddingTop: 8
          }
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: tabIcon('home-outline', 'home') }} />
        <Tabs.Screen name="routine" options={{ title: 'Rutina', tabBarIcon: tabIcon('leaf-outline', 'leaf') }} />
        <Tabs.Screen
          name="products"
          options={{ title: 'Productos', tabBarIcon: tabIcon('bag-outline', 'bag') }}
        />
        <Tabs.Screen
          name="progress"
          options={{ title: 'Progreso', tabBarIcon: tabIcon('bar-chart-outline', 'bar-chart') }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon('person-outline', 'person') }} />
      </Tabs>
      <FloatingActionMenu />
    </View>
  );
}
