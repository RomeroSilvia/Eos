# Eos

Aplicacion movil de skincare para seguimiento personal de rutinas, productos y progreso.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19.1
- TypeScript estricto
- expo-router
- Expo Notifications
- Expo Secure Store

## Estructura

```txt
app/
components/
hooks/
types/
constants/
services/
utils/
assets/
docs/
```

## Comandos de creacion recomendados

```bash
npx create-expo-app@latest eos
cd eos
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install expo-notifications expo-secure-store react-native-gesture-handler react-native-reanimated
npx expo install @expo/vector-icons
npx expo-doctor
npx expo start
```

## Comandos del proyecto

```bash
npm install
npm run doctor
npm run start
npm run android
npm run ios
```

## Modulos verticales

- Inicio / Home
- Rutinas
- Productos
- Progreso / Historial
- Perfil / Autenticacion / Configuracion

Cada integrante trabaja el flujo completo de su modulo: pantalla, componentes, tipos, hook, servicio mock, validaciones, documentacion y pruebas manuales.
