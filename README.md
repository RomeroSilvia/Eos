# Eos

Aplicación móvil de seguimiento personal de rutinas de skincare. Permite registrar rutinas diarias, productos, completar pasos, visualizar el progreso a lo largo del tiempo y recibir recordatorios push.

Proyecto académico — UTN, cuarto año, Aplicaciones Móviles.

## Stack

**Frontend**
- Expo SDK 54 / React Native 0.81 / React 19.1
- TypeScript estricto
- expo-router (navegación basada en archivos)
- expo-secure-store (almacenamiento de tokens JWT)
- expo-notifications (notificaciones locales y push)
- expo-apple-authentication
- expo-image-picker (selección de fotos)
- expo-image-manipulator (compresión de imágenes antes del upload)
- @react-native-async-storage/async-storage
- @react-native-google-signin/google-signin

**Backend**
- Node.js + Express 4 + TypeScript
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- multer (subida de imágenes multipart)
- node-cron (scheduler de recordatorios push)
- Jest + ts-jest (tests)

## Requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) o usar `npx expo`
- Aplicación Expo Go en el celular, o emulador Android/iOS
- Cuenta en Supabase con el schema cargado (ver `docs/database-setup.md`)

## Instalación y desarrollo

### 1. App móvil (raíz)

```bash
npm install
cp .env.example .env
npm start              # Expo en modo desarrollo
```

Variables de entorno del frontend (`.env`):

```
EXPO_PUBLIC_API_URL=http://<ip-de-tu-maquina>:3000/api
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_SUPABASE_URL=<tu-url-supabase>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<google-android-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<google-ios-client-id>
```

Con `EXPO_PUBLIC_USE_MOCKS=true` la app funciona sin backend, devolviendo datos hardcodeados.

Google Sign-In con `@react-native-google-signin/google-signin` esta habilitado para Android e iOS. La version publica instalada no implementa el flujo web; para web se requiere un flujo separado con Google Identity Services.

Apple Sign-In no requiere variables `EXPO_PUBLIC_*`. Funciona solo en iOS con un build nativo que tenga el capability "Sign in with Apple" habilitado para el bundle identifier `com.eos.skincare`. Tambien debe estar configurado el provider Apple en Supabase Auth. No esta disponible como flujo funcional en Android ni web.

### 2. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env   # Completar con credenciales Supabase
npm run dev            # Servidor con hot reload en http://localhost:3000
```

Variables de entorno del backend (`backend/.env`):

```
PORT=3000
SUPABASE_URL=<tu-url-supabase>
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
CORS_ORIGIN=http://<ip-de-tu-maquina>:8081
```

### Health checks

```
GET http://localhost:3000/api/health
GET http://localhost:3000/api/routines/health
GET http://localhost:3000/api/products/health
GET http://localhost:3000/api/progress/health
GET http://localhost:3000/api/notifications/health
GET http://localhost:3000/api/specialists/health
```

## Migraciones de base de datos — Entrega 2

Ejecutar en Supabase SQL Editor en el siguiente orden antes de levantar el backend.

### 1. Schema base E2 (roles, especialistas, chat)

```sql
-- database/e2_schema.sql
```

### 2. Políticas de storage para documentos de especialistas

```sql
-- database/specialist_docs_storage_policies.sql
```

### 3. RLS para specialist_profiles

```sql
-- database/specialist_profiles_rls_policies.sql
```

### 4. RLS para profiles

```sql
-- database/e2_profiles_rls_policies.sql
```

### 5. Historial de notificaciones (Módulo 2)

```sql
create table notification_history (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade not null,
  title       text        not null,
  body        text        not null default '',
  kind        text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index notification_history_user_idx
  on notification_history(user_id, created_at desc);

alter table notification_history enable row level security;

create policy "Usuarios leen sus propias notificaciones"
  on notification_history for select using (auth.uid() = user_id);

create policy "Usuarios actualizan sus propias notificaciones"
  on notification_history for update using (auth.uid() = user_id);
```

### 6. Rutinas asignadas por especialista (Módulo 4)

```sql
-- database/e2_m4_assigned_routines.sql
```

### 7. Chat con medios y Realtime (Módulo 5)

```sql
-- database/e5_chat_messages_media_realtime.sql
```

### 8. Entrega 3 Módulo 5 - Planes y Reportes

```sql
-- supabase/migrations/20260701000500_e3_m5_subscriptions_schema.sql
-- supabase/migrations/20260701000501_e3_m5_metrics_views.sql
-- database/e3_m5_subscription_plans_seed.sql
```

## Módulos verticales — Entrega 2

### Módulo 1 — Apple Sign-In y Actualización de Perfil de Piel

Implementado:

- Columna `role` en `profiles` sincronizada desde `user_metadata` de Supabase Auth al registrar y loguear.
- Navegación diferenciada por rol: `user` → `(tabs)`, `specialist` verificado → `(tabs-specialist)`, `specialist` pendiente/rechazado → `/specialist-status`, `center_admin` → `(tabs-admin)`.
- Actualización de tipo de piel desde el perfil sin necesidad de repetir el quiz completo.

### Módulo 2 — Push Notifications

Implementado:

- Registro y desregistro de tokens de dispositivo (`push_tokens`).
- Cron job que envía notificaciones push a las 08:00 y 21:00 a usuarios con rutinas activas y token registrado. Mensajes personalizados con el nombre de la rutina.
- Historial de notificaciones persistido en `notification_history` (el backend es la fuente de verdad).
- Endpoints `GET /api/notifications` y `PATCH /api/notifications/:id/read`.
- Pantalla in-app con loading state, agrupación por día (Hoy / Ayer / fecha) y tabs Todas / No leídas.
- `BellButton` con punto rojo que se refresca al volver a foco en cada tab (caché de 30 s compartida entre instancias).
- Tipos de notificación soportados: `streak`, `routine-morning`, `routine-evening`, `product-reminder`, `routine-assigned`, `new-message`.
- `RemindersSection` — componente reutilizable en home y perfil: muestra las rutinas activas con ícono sol/luna y horario.
- `notificationsService.sendToUser()` — función interna para que otros módulos envíen notificaciones y las persistan en historial.

### Módulo 3 — Roles y Registro de Especialistas

Implementado:

- Registro con roles `user` y `specialist`; `center_admin` bloqueado en registro público.
- Middleware `authenticate` y `requireRole`.
- Flujo de registro de especialista con foto de DNI, número de matrícula y foto del título; compresión y validación de tamaño antes del upload.
- Estados de matrícula: `pending`, `verified`, `rejected`.
- Panel de administrador para aprobar o rechazar especialistas.
- Storage privado para documentos con signed URLs temporales.
- Navegación diferenciada por rol y `license_status`.

### Módulo 4 — Asignación de Rutinas por Especialista

Implementado:

- Columna `assigned_by` en `routines` que referencia al especialista que asignó la rutina.
- RLS en Supabase: los especialistas solo pueden crear/editar/eliminar rutinas de sus pacientes activos.
- Migración idempotente en `database/e2_m4_assigned_routines.sql`.
- Notificación push + registro en historial al cliente cuando un especialista le asigna una rutina (`routine-assigned`).
- Directorio de especialistas verificados con filtros por especialidad y nombre.
- `SpecialistHomeCard` en home: muestra especialista vinculado o CTA para buscar uno.
- `AppHeader` — componente de navegación reutilizable con breadcrumb.
- Pantalla `app/settings.tsx` — configuración de perfil, contraseña, toggle de notificaciones y re-test de piel.

### Módulo 5 — Chat con Medios y Realtime

Implementado:

- Bucket `chat-media` en Supabase Storage (privado, límite 15 MB, formatos JPEG/PNG/WebP).
- Columnas de medios en `chat_messages`: `message_type` (`text` | `image`), `media_path`, `media_mime_type`, `media_size`.
- Publicación de `chat_messages` en Supabase Realtime para actualizaciones en tiempo real.
- Chat con envío de imágenes via `expo-image-picker`, separadores de fecha y soporte de videollamada.
- Notificación push al destinatario al recibir un mensaje nuevo (`new-message`).

## Entrega 3 - Módulo 5 (Planes/Suscripciones y Metricas)

Implementado:

- Backend `subscriptions` con CRUD de planes y asignación/cambio de suscripciones.
- Migraciones E3 para `subscription_plans`, `subscriptions` e índices/vista de métricas.
- Pantallas admin: `/(tabs-admin)/plans` y `/(tabs-admin)/metrics`.
- Servicio frontend `services/subscriptions.ts`.
- Integración best-effort con contrato de auditoría (`recordAuditLog`).
- Regla de alcance E3 explícita: `subscriptions.status` es informativo y no bloquea features de otros módulos.

## Documentación adicional

| Archivo | Contenido |
|---|---|
| `docs/plan_entrega2.md` | Plan y estado actual de la Entrega 2 |
| `docs/estructura-proyecto.md` | Estructura detallada y convenciones |
| `docs/backend-setup.md` | Endpoints y setup del backend |
| `docs/database-setup.md` | Schema de base de datos y pendientes |
| `docs/env.md` | Variables de entorno completas |
| `docs/division-modulos.md` | División de responsabilidades por integrante |
| `docs/progress-module-contract.md` | Contrato técnico del módulo Progreso |
| `docs/plan-tecnico.md` | Plan técnico de las tres entregas |
| `CLAUDE.md` | Guía para Claude Code |

## Supabase CLI

No hace falta instalar Supabase CLI globalmente. El proyecto usa la CLI como dev dependency y la ejecuta con un wrapper local que guarda la configuracion/cache dentro del repo.

```bash
npm install
npm run supabase -- --version
```

Comandos utiles:

```bash
npm run supabase -- login
npm run supabase -- link --project-ref <PROJECT_REF>
npm run supabase:db:push
npm run supabase:types -- --project-id <PROJECT_ID> > backend/src/database/database.types.ts
```
