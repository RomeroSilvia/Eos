import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="start-diagnosis" />
        <Stack.Screen name="start-quiz" />
        <Stack.Screen name="quiz-results" />
        <Stack.Screen name="resultados" />
        <Stack.Screen name="specialist-status" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="patients/[id]" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(tabs-admin)" />
        <Stack.Screen name="(tabs-specialist)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
