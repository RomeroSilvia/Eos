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
├── types/            Contratos TypeScript compartidos
├── constants/        Paleta de colores y rutas tipadas
├── utils/            Funciones auxiliares puras (fechas, formateo, calendario)
├── assets/           Recursos visuales locales
├── docs/             Documentación académica y técnica
├── database/         Schema SQL inicial
└── backend/          Servidor Express independiente
    └── src/
        ├── app.ts
        ├── server.ts
        ├── config/       Variables de entorno y cliente Supabase
        ├── database/     Tipos del schema, tableNames y database.types.ts
        ├── middlewares/  auth, error, notFound
        ├── modules/      Módulos por dominio (ver abajo)
        └── utils/        ApiError y asyncHandler
```

## Pantallas (app/)

```txt
app/
├── _layout.tsx               Layout raíz (Stack + GestureHandlerRootView)
├── index.tsx                 Redirección inicial → /landing
├── landing.tsx               Bienvenida pre-auth (botones: registro, login)
├── start-diagnosis.tsx       Inicio del flujo de diagnóstico
├── start-quiz.tsx            Pantalla introductoria al quiz
├── quiz.tsx                  Quiz de 5 preguntas (edad, piel, imperfecciones, objetivo, pasos)
├── quiz-results.tsx          Resultados del perfil de piel
├── resultados.tsx            Redirección post-quiz
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── update-password.tsx
├── (tabs)/
│   ├── _layout.tsx           Tabs con 5 ítems e ícono activo/inactivo
│   ├── home.tsx
│   ├── routine.tsx
│   ├── products.tsx
│   ├── progress.tsx
│   └── profile.tsx
├── routine/
│   ├── Create.tsx            Step 1 del wizard
│   ├── Step2.tsx             Crea routineId en backend
│   ├── Step3.tsx
│   ├── Step4.tsx
│   ├── Step5-products.tsx    Asocia productos a pasos
│   ├── Step6-confirm.tsx
│   ├── success.tsx
│   ├── Add-step.tsx          Agregar paso a rutina existente
│   └── routine-edit.tsx      Edición de rutina
├── products/
│   ├── index.tsx             Listado
│   ├── [id].tsx              Detalle
│   ├── create.tsx            Formulario de creación con imagen
│   └── result.tsx            Confirmación de creación
└── progress/
    ├── stats.tsx             Estadísticas avanzadas
    └── history/
        ├── index.tsx         Historial de progreso
        └── [date].tsx        Detalle de un día específico
```

## Módulos del backend (backend/src/modules/)

Cada módulo sigue el patrón: `routes → controller → service → repository`.

```txt
modules/
├── auth/       register, login, googleLogin, forgotPassword, updatePassword
├── quiz/       saveQuiz, getQuizProfile  (sin service/repository propio — usa Supabase directo en controller)
├── routines/   CRUD rutinas, pasos, asociación paso-producto, logs diarios
├── products/   CRUD productos con imagen (multer)
├── progress/   summary, history, stats (solo lectura, calcula desde routine_logs)
└── profile/    GET y PATCH del perfil de usuario
```

Tests co-localizados en `modules/<modulo>/tests/*.test.ts`.

## Rutas de la API (backend)

```txt
GET  /api/health

POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/update-password

GET  /api/quiz/profile
POST /api/quiz/save

GET    /api/routines
POST   /api/routines
GET    /api/routines/:id
PATCH  /api/routines/:id
DELETE /api/routines/:id
GET    /api/routines/:id/steps
POST   /api/routines/:id/steps
GET    /api/routines/steps/:stepId/products
PUT    /api/routines/steps/:stepId/products
POST   /api/routines/steps/:stepId/products
DELETE /api/routines/steps/:stepId/products/:productId
PATCH  /api/routines/steps/:stepId
DELETE /api/routines/steps/:stepId

GET    /api/products
GET    /api/products/:id
POST   /api/products             (multipart/form-data con imagen)
PATCH  /api/products/:id
DELETE /api/products/:id

GET  /api/progress/summary
GET  /api/progress/stats
GET  /api/progress/history
GET  /api/progress/history/:date

GET   /api/profile
PATCH /api/profile
```

## Capas del frontend

```txt
screens (app/)
  └── hooks/
        useHome · useRoutine · useProducts · useProgress
        useProfile · useProgressHistory · useProgressStats
        └── services/
              auth.ts · routines.ts · products.ts · progress.ts · notifications.ts
              └── services/api/client.ts
                    apiRequest<T> · ApiRequestError · getAuthHeader · apiConfig
```

## Convenciones

- Imports con alias `@/` (raíz del proyecto).
- Colores siempre desde `constants/colors.ts`.
- Rutas de navegación desde `constants/routes.ts`.
- Estilos con `StyleSheet.create` inline en cada componente.
- Mensajes de error al usuario en español.
- Backend: errores con `ApiError`, handlers envueltos en `asyncHandler`.
- Backend: `req.user.id` inyectado por `auth.middleware.ts` (Bearer token validado por Supabase).
- Tests en español, co-localizados en `modules/<modulo>/tests/`.
