# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Eos es una app móvil de seguimiento de rutinas de skincare, desarrollada como proyecto académico en UTN. Tiene dos partes independientes: la app React Native (raíz) y el backend Express (carpeta `backend/`).

## Comandos

### App móvil (raíz)

```bash
npm start          # Inicia Expo en modo desarrollo
npm run android    # Inicia en Android
npm run ios        # Inicia en iOS
npm run lint       # ESLint vía expo lint
```

### Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env   # Completar con credenciales Supabase
npm run dev            # ts-node-dev con hot reload
npm run typecheck      # Verificar tipos sin compilar
npm test               # Jest
npm run build          # Compilar a dist/
```

### Health checks del backend

```
GET http://localhost:3000/api/health
GET http://localhost:3000/api/routines/health
GET http://localhost:3000/api/products/health
GET http://localhost:3000/api/progress/health
```

## Arquitectura

### App móvil

La navegación usa expo-router con estructura de archivos:

- `app/_layout.tsx` — Root layout con Stack y GestureHandlerRootView
- `app/(auth)/` — Login y registro (mock actual)
- `app/(tabs)/` — Tabs principales: home, routine, products, progress, profile
- `app/routine/` — Flujo de creación de rutina (pasos Step2–Step6 + confirm + success)
- `app/products/` — Creación, detalle y resultado de productos

La app tiene un modo mock controlado por `EXPO_PUBLIC_USE_MOCKS`. Cuando es `true` (valor por defecto), los servicios devuelven datos hardcodeados sin llamar al backend. Cuando es `false`, llaman a `http://<host>:3000/api`.

La URL del backend se detecta automáticamente desde `Constants.expoConfig.hostUri` para adaptarse al host de Expo en dispositivos físicos. Se puede sobreescribir con `EXPO_PUBLIC_API_URL`.

**Capas de la app:**

```
screens (app/)
  └── hooks/ (useHome, useRoutine, useProducts, useProgress, useProfile)
        └── services/ (routines.ts, products.ts, progress.ts, notifications.ts)
              └── services/api/client.ts (apiRequest + apiConfig)
```

Cada hook encapsula estado local (`useState`) y expone funciones de refresco. Los screens usan `useFocusEffect` para recargar al volver a foco.

### Backend

Express + TypeScript + Supabase. Organización por módulo:

```
backend/src/modules/<modulo>/
  ├── <modulo>.routes.ts      — Define las rutas Express
  ├── <modulo>.controller.ts  — Parsea request/response
  ├── <modulo>.service.ts     — Lógica de negocio
  └── <modulo>.repository.ts  — Consultas a Supabase
```

Módulos actuales: `auth`, `profile`, `routines`, `products`, `progress`.

Los tipos de base de datos se generan desde Supabase y viven en `backend/src/database/database.types.ts`. Los aliases de conveniencia (`RoutineRow`, `ProductInsert`, etc.) están en `backend/src/database/schema.types.ts`.

El backend usa `multer` para subida de imágenes de productos (multipart/form-data). Los demás endpoints usan `application/json`.

### Tipos compartidos (frontend)

Los tipos de dominio del frontend están en `types/`:
- `user.ts` — `UserProfile`, `UserRole`, `SkinType`
- `routine.ts` — `Routine`, `RoutineStep`, `RoutineTimeOfDay`
- `product.ts` — `Product`, `ProductCategory`, `ProductBrand`
- `progress.ts` — `ProgressSummary`, `StreakProgress`, `CalendarDayProgress`
- `reminder.ts` — `Reminder`

## Variables de entorno

**Frontend** (archivo `.env` en la raíz, prefijo `EXPO_PUBLIC_`):
- `EXPO_PUBLIC_API_URL` — URL base del backend (opcional, se autodetecta en dev)
- `EXPO_PUBLIC_USE_MOCKS` — `"false"` para usar el backend real (por defecto `true`)
- `EXPO_PUBLIC_PROGRESS_USER_ID` — ID de usuario para progreso (por defecto `user-marta`)

**Backend** (archivo `backend/.env`):
- `PORT` — Puerto del servidor (default `3000`)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Credenciales Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Solo para el backend, nunca exponer al cliente
- `CORS_ORIGIN` — Origen permitido (default `http://localhost:8081`)

## Convenciones

- Imports con alias `@/` (mapeado a la raíz del proyecto en `tsconfig.json`)
- Colores siempre desde `constants/colors.ts`, nunca hardcodeados
- Estilos con `StyleSheet.create` inline en cada componente
- Los errores de API se loguean con `console.error` y se propagan como `Error` con mensaje en español
- Los screens muestran mensajes de error en español (ej: `'No pudimos cargar tu rutina.'`)
