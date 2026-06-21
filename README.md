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
- expo-image-picker (fotos de productos)
- @react-native-async-storage/async-storage
- @react-native-google-signin/google-signin

**Backend**
- Node.js + Express 4 + TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- multer (subida de imágenes)
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
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_SUPABASE_URL=<tu-url-supabase>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

Con `EXPO_PUBLIC_USE_MOCKS=true` la app funciona sin backend, devolviendo datos hardcodeados.

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
CORS_ORIGIN=http://localhost:8081
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

## Módulos verticales — Entrega 2

### Módulo 2 — Push Notifications (rama: `feature/e2-push-notifications`)

Implementado:

- Registro y desregistro de tokens de dispositivo (`push_tokens`).
- Cron job que envía recordatorios push a las 08:00 y 21:00 a usuarios con rutinas activas.
- Mensajes personalizados con el nombre de la rutina: mañana (`Buen día ☀️ Hora de empezar tu rutina <nombre>`) y noche (`No te duermas sin tu rutina <nombre>`).
- Historial de notificaciones persistido en `notification_history` (backend es la fuente de verdad).
- Endpoints `GET /api/notifications` y `PATCH /api/notifications/:id/read`.
- Pantalla in-app con loading state, agrupación por día (Hoy / Ayer / fecha) y tabs Todas / No leídas.
- `BellButton` muestra el punto rojo solo cuando hay notificaciones sin leer (caché de 30 s).
- `RemindersSection` — componente reutilizable en home y perfil: muestra las rutinas activas con ícono sol (mañana) o luna (noche) y horario. Al tocar navega a la tab de rutinas.

### Módulo 3 — Roles y Registro de Especialistas (rama: `feature/e2-roles-specialist-register`)

Implementado:

- Registro con roles `user` y `specialist`; `center_admin` bloqueado en registro público.
- Middleware `authenticate` y `requireRole`.
- Flujo de registro de especialista con foto de DNI, número de matrícula y foto del título.
- Estados de matrícula: `pending`, `verified`, `rejected`.
- Panel de administrador para aprobar o rechazar especialistas.
- Storage privado para documentos con signed URLs temporales.
- Navegación diferenciada por rol y `license_status`.

Fuera del alcance de este módulo (pendiente en E2):

- Gestión real de clientes desde el panel del especialista.
- Chat y buscador de especialistas.
- Asignación de rutinas por especialista.
- Tabs del especialista con datos reales de clientes.

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

Si aparece "Supabase CLI no esta instalado", no uses `npm install -g supabase`: ejecuta `npm install` en la raiz y volve a correr el comando con `npm run supabase -- ...` o `npx supabase ...`.