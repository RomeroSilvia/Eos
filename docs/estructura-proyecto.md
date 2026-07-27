# Estructura del proyecto Eos

Eos usa Expo SDK 54, TypeScript estricto y expo-router para navegación basada en archivos. El proyecto está dividido en una app móvil (frontend) y un backend propio con Express + Supabase.

## Estructura general

```txt
Eos/
├── app/              Rutas y pantallas (expo-router)
├── components/       Componentes UI reutilizables
├── hooks/            Lógica de lectura y composición por módulo
├── services/         Clientes HTTP y servicios de dominio
│   └── api/          Cliente base fetch con auth y manejo de errores
├── types/            Contratos TypeScript compartidos (routine, product, progress,
│                     user, notification, reminder, audit, chat, specialist,
│                     center, subscription)
├── constants/        Paleta de colores y rutas tipadas
├── utils/            Funciones auxiliares puras (fechas, formateo, calendario,
│                     tipo de piel, validación de contraseña)
├── assets/           Recursos visuales locales
├── scripts/          Scripts Node (perf del wizard, wrapper de Supabase CLI local)
├── database/         Schema SQL histórico y policies RLS por módulo/entrega
├── supabase/         Migraciones formales (fuente de verdad del schema) — supabase/migrations/
├── agents/skills/     Skills de referencia por feature/epic para agentes de código
├── docs/             Documentación técnica y académica
└── backend/          Servidor Express independiente
    └── src/
        ├── app.ts
        ├── server.ts
        ├── config/       Variables de entorno y cliente Supabase
        ├── database/     tableNames.ts, database.types.ts, schema.types.ts
        ├── middlewares/  auth, requireRole, error, notFound
        ├── modules/      Módulos por dominio (ver abajo)
        ├── jobs/         Cron de recordatorios push (node-cron)
        ├── types/        Extensión de tipos de Express (req.user)
        └── utils/        ApiError y asyncHandler
```

## Pantallas (app/)

```txt
app/
├── _layout.tsx               Layout raíz (Stack + GestureHandlerRootView)
├── index.tsx                 Redirección inicial → /landing
├── landing.tsx                Bienvenida pre-auth
├── start-diagnosis.tsx       Inicio del flujo de diagnóstico
├── start-quiz.tsx            Pantalla introductoria al quiz
├── quiz.tsx                  Quiz de diagnóstico de piel
├── quiz-results.tsx          Resultados del perfil de piel
├── resultados.tsx            Redirección post-quiz
├── chat.tsx                  Chat en tiempo real con especialista
├── notifications.tsx         Centro de notificaciones in-app
├── settings.tsx               Configuración de perfil/contraseña/notificaciones
├── specialist-status.tsx     Estado de matrícula para especialistas no verificados
├── (auth)/                   Login, registro, recuperación de contraseña
│   ├── login.tsx · register.tsx · forgot-password.tsx · update-password.tsx
├── (tabs)/                   Tabs de usuario final (rol user)
│   ├── home.tsx · routine.tsx · products.tsx · progress.tsx · specialists.tsx · profile.tsx
├── (tabs-specialist)/        Tabs de especialista verificado
│   ├── index.tsx · pacientes.tsx · rutinas.tsx · consultas.tsx · profile.tsx
├── (tabs-admin)/             Tabs de administrador de centro
│   ├── index.tsx · centers.tsx · plans.tsx · audit-log.tsx · metrics.tsx
│   └── metrics/[centerId].tsx
├── routine/                  Wizard de creación/edición de rutina
│   ├── Create.tsx · Step2.tsx · Step3.tsx · Step4.tsx · Step5-products.tsx
│   ├── Step6-confirm.tsx · success.tsx · Add-step.tsx · routine-edit.tsx
├── products/
│   ├── index.tsx · [id].tsx · create.tsx · result.tsx
├── progress/
│   ├── stats.tsx
│   └── history/index.tsx · history/[date].tsx
├── specialists/
│   └── [id].tsx               Perfil público de un especialista
└── patients/
    └── [id].tsx                Vista de un paciente (desde la mirada del especialista)
```

La navegación por rol se resuelve en el `_layout.tsx` de cada route group (`(tabs)`, `(tabs-specialist)`, `(tabs-admin)`), que redirige según `profile.role` y, para especialistas, `license_status`. `app/_layout.tsx` (raíz) no implementa ningún guard de sesión global todavía — ver README, Entrega 3 / Módulo 2 (pendiente).

## Módulos del backend (backend/src/modules/)

Cada módulo sigue el patrón `routes → controller → service → repository` (con las excepciones que se indican).

```txt
modules/
├── auth/          register, login, googleLogin, forgotPassword, updatePassword
├── profile/       GET/PATCH del perfil de usuario
├── quiz/          saveQuiz, getQuizProfile — sin service/repository propio, accede a Supabase directo desde el controller
├── routines/       CRUD rutinas, pasos, asociación paso-producto, logs diarios
├── products/       CRUD productos con imagen (multer)
├── progress/       summary, stats, history, detalle diario y de rutina (solo lectura, calcula desde routine_logs)
├── specialists/    dos routers: specialists.routes.ts (directorio/vínculos, /api/specialists) y specialist.legacy.routes.ts (registro/estado, /api/specialist)
├── chat/           mensajes con soporte de imagen, videollamada, Supabase Realtime
├── notifications/  registro de push token, historial, marcar como leída
├── admin/          aprobación de especialistas, asignación a centro
├── centers/        CRUD de centros estéticos y su dashboard
├── audit/          lectura de audit_logs con filtros y paginación
└── subscriptions/  CRUD de planes y asignación de suscripciones
```

Tests co-localizados en `modules/<modulo>/tests/*.test.ts`. Ver el listado completo de endpoints en `docs/backend-setup.md` y en el `README.md` de la raíz (sección de health checks).

## Capas del frontend

```txt
screens (app/)
  └── hooks/ (useHome, useRoutine, useProducts, useProgress, useProfile,
              useProgressHistory, useProgressStats, useRoutineWizard,
              useHasUnreadNotifications, useRoutineWizardProfiler)
        └── services/ (auth.ts, routines.ts, products.ts, progress.ts, quiz.ts,
                       specialist.ts, chat.ts, admin.ts, centers.ts,
                       subscriptions.ts, audit.ts, notifications.ts, supabase.ts)
              └── services/api/ (client.ts: apiRequest<T> · ApiRequestError · apiConfig
                                  token.ts: getStoredAccessToken/setStoredAccessToken/deleteStoredAccessToken,
                                  única fuente de lectura/escritura del token de sesión)
```

`services/supabase.ts` es un cliente Supabase aparte, usado solo para funcionalidades de Realtime (chat) — requiere `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`. El resto de los servicios hablan con el backend propio vía `services/api/client.ts`.

Los tipos de dominio de cada servicio (`ChatMessage`, `SpecialistStatus`, `Center`, `Subscription`, etc.) viven en `types/` y cada `service` los re-exporta para no romper a sus consumidores — no hay que importarlos directo de `types/` salvo que se prefiera.

`components/OnboardingScreen.tsx` es un componente compartido (título, subtítulo, lista de beneficios y botones parametrizables) usado por `app/landing.tsx`, `app/start-quiz.tsx` y `app/start-diagnosis.tsx`, que antes duplicaban el mismo layout.

## Convenciones

- Imports con alias `@/` (raíz del proyecto).
- Colores siempre desde `constants/colors.ts`.
- Rutas de navegación desde `constants/routes.ts`.
- Estilos con `StyleSheet.create` inline en cada componente.
- Mensajes de error al usuario en español.
- Backend: errores con `ApiError`, handlers envueltos en `asyncHandler`.
- Backend: `req.user.id`/`req.user.role` inyectados por `auth.middleware.ts` (Bearer token validado contra Supabase Auth). No hay middleware de auth mock — desarrollo y producción siempre validan un token real.
- Tests en español, co-localizados en `modules/<modulo>/tests/` (solo backend).
- Logging condicional al entorno siempre con `__DEV__` (no `process.env.NODE_ENV`).
- Errores de API amigables reusando `getFriendlyApiErrorMessage`/`hasTechnicalDetails` de `services/api/client.ts` en vez de reimplementarlos por servicio.
- Validación de contraseña única en `utils/password.ts` (`isValidPassword`), usada en registro, cambio de contraseña (`settings.tsx`) y recuperación (`update-password.tsx`).

## Deuda técnica conocida (documentada, no arreglada)

- `app/routine/Step5-products.tsx` es un placeholder no funcional dentro del wizard de creación de rutina: los pasos/productos mostrados son datos fijos y los botones "+ Añadir producto" están deshabilitados a propósito. No lee ni escribe los pasos reales de la rutina.
- `app/(auth)/update-password.tsx`: el flujo de recuperación de contraseña solo funciona en la build web (lee el token de recuperación desde `window.location.hash`/`search`). En mobile nativo siempre falla con "Link inválido".
- 4 pantallas "god component" quedan fuera de esta pasada de consistencia por su tamaño: `app/chat.tsx`, `(tabs-admin)/plans.tsx`, `(tabs-admin)/centers.tsx`, `(tabs-admin)/index.tsx`.
