# EOS — Plan de Entrega 2
**Aplicaciones Móviles · Grupo 4 · UTN-FRLP · 2026**

> Este archivo es el punto de entrada para Claude Code y GitHub Copilot.
> Leerlo completo antes de tocar cualquier archivo del proyecto.

---

## Estado real al cierre de Entrega 1

### Lo que está implementado y funcionando

**Backend** (`backend/src/modules/`):
- `auth` — registro, login, Google OAuth, reset/update password. El registro ya acepta y guarda el campo `role` en Supabase `user_metadata`. El middleware `authenticate` extrae `req.user.id` del JWT de Supabase.
- `quiz` — guarda y lee el perfil de piel en `skin_profiles` (endpoints `/api/quiz/save` y `/api/quiz/profile`).
- `routines` — CRUD completo de rutinas y pasos; asociación de productos a pasos (`routine_step_products`); logs diarios (`routine_logs`, `routine_step_logs`).
- `products` — CRUD con subida de imágenes a Supabase Storage (bucket `product-images`). El método `remove` elimina directamente **sin verificar** si el producto está en uso — esto es un bug conocido a corregir en E2.
- `progress` — resumen semanal/mensual, racha, calendario, historial por fecha, estadísticas. Tiene tests unitarios.
- `profile` — el repository tiene los métodos como TODO (no implementados); el controller/routes existen.

**Frontend** (`app/`):
- Auth completo: landing, login, registro con rol, Google Sign-In, forgot/update-password.
- Quiz de diagnóstico de piel.
- Tabs: home, rutina, productos, progreso, perfil.
- Wizard de creación de rutina (6 pasos).
- Notificaciones **locales** con `expo-notifications` ya configuradas en `services/notifications.ts`.

### Lo que NO existe todavía

| Feature | Estado |
|---------|--------|
| Apple Sign-In | No implementado |
| Push notifications remotas | Solo hay local scheduling; no hay registro de tokens ni envío remoto |
| Rol `specialist` con permisos reales | El campo `role` se guarda pero no hay enforcement ni UI diferenciada |
| Registro de especialista (matrícula, foto DNI, título) | No existe |
| Panel de especialista / gestión de clientes | No existe |
| Buscador de especialistas | No existe |
| Asignación de rutinas por especialista | No existe |
| Chat de consultas | No existe |
| Actualización de tipo de piel desde perfil | Solo existe el quiz inicial; no hay edición posterior |
| Protección al eliminar producto en uso | El `remove` no verifica; bug a corregir |
| RLS en Supabase | Comentada en `initial_schema.sql` como TODO |

### Tablas existentes en Supabase

```
profiles              → id, full_name, email, skin_type, created_at, updated_at
skin_profiles         → id, user_id, age_range, skin_type, imperfections, main_goal, routine_steps, created_at
routines              → id, user_id, name, description, time_of_day, is_active, created_at, updated_at
routine_steps         → id, routine_id, name, description, category, step_order, is_required, created_at, updated_at
products              → id, user_id, name, brand, category, notes, image_url, created_at, updated_at
routine_step_products → id, step_id, product_id, created_at   (UNIQUE step_id+product_id)
routine_logs          → id, user_id, routine_id, log_date, completed_at, completion_percentage, created_at, updated_at
routine_step_logs     → id, routine_log_id, step_id, is_completed, completed_at, created_at, updated_at
push_tokens           → id, user_id (UNIQUE), expo_token, platform ('ios'|'android'), updated_at  [RLS habilitado]
```

**Nota importante:** la tabla `profiles` no tiene columna `role`. El rol se guarda solo en `user_metadata` de Supabase Auth. Esto se debe resolver en E2.

---

## Objetivos de Entrega 2

1. **Apple Sign-In** como segunda opción de autenticación social.
2. **Push notifications remotas** sincronizadas con las rutinas del usuario.
3. **Sistema de roles real**: columna `role` en `profiles`, enforcement en middleware, navegación diferenciada.
4. **Flujo de registro de especialista** con foto de DNI, número de matrícula y foto del título.
5. **Panel del especialista**: ver clientes, su historial y tipo de piel.
6. **Asignación de rutinas** por el especialista al cliente.
7. **Buscador de especialistas** para el cliente.
8. **Chat de consultas** directas cliente-especialista usando Supabase Realtime.
9. **Fix CRÍTICO-01**: actualización de tipo de piel desde el perfil (sin historial).
10. **Fix CRÍTICO-02**: protección al eliminar producto que está en una rutina activa.

---

## Migraciones de base de datos para Entrega 2

Crear el archivo `database/e2_schema.sql`. Ejecutar en Supabase SQL Editor **antes** de codificar cualquier módulo.

```sql
-- ─────────────────────────────────────────────────────────────
-- E2 MIGRATION — ejecutar después de initial_schema.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Agregar columna role a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'specialist', 'center_admin'));

-- 2. Tabla de perfiles de especialista
CREATE TABLE IF NOT EXISTS public.specialist_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty         TEXT NOT NULL CHECK (specialty IN ('dermatologo', 'cosmetologo')),
  license_number    TEXT NOT NULL,
  license_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (license_status IN ('pending', 'verified', 'rejected')),
  -- Documentos de verificación en Supabase Storage
  dni_photo_url     TEXT,
  title_photo_url   TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (license_number)
);

-- 3. Relación cliente-especialista (un cliente tiene un especialista activo a la vez)
CREATE TABLE IF NOT EXISTS public.client_specialist_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialist_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)   -- un cliente solo puede tener una relación activa
);

-- 4. Chat de consultas
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_id  UUID NOT NULL REFERENCES public.client_specialist_relations(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id),
  content      TEXT NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tokens de push notifications
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_token  TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios', 'android')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 6. Campo assigned_by en routines para rutinas asignadas por especialista
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- NULL = rutina propia del usuario; UUID = especialista que la asignó

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_specialist_profiles_user_id    ON public.specialist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_specialist_profiles_status     ON public.specialist_profiles(license_status);
CREATE INDEX IF NOT EXISTS idx_csr_client_id                  ON public.client_specialist_relations(client_id);
CREATE INDEX IF NOT EXISTS idx_csr_specialist_id              ON public.client_specialist_relations(specialist_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_relation_id      ON public.chat_messages(relation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at       ON public.chat_messages(created_at);

-- 8. Habilitar Realtime solo en chat_messages
-- Hacer desde Supabase Dashboard → Database → Replication → Tables → chat_messages
```

**Después de ejecutar la migración:**
1. Actualizar `database/tableNames.ts` con los nuevos nombres de tabla.
2. Regenerar `database/database.types.ts` con `supabase gen types typescript`.
3. Actualizar `database/schema.types.ts` con los nuevos aliases.
4. Habilitar Realtime en `chat_messages` desde el Dashboard de Supabase.

---

## División en 5 módulos independientes

Cada módulo es **full-stack vertical**: el integrante responsable implementa backend (routes/controller/service/repository/tests) y frontend (screens/hook/service/tipos). La única coordinación necesaria es a través de los contratos de interfaz definidos al final de cada módulo.

---

## Módulo 1 — Apple Sign-In y Actualización de Perfil de Piel
 
**Rama sugerida:** `feature/e2-apple-auth-skin-update`

### Contexto de partida

- Google Sign-In funciona end-to-end: `auth.controller.ts → googleLogin` + `services/auth.ts` en el frontend.
- El quiz guarda en `skin_profiles` pero no hay forma de editar el resultado después del onboarding.
- El campo `role` no existe en `profiles`; solo está en `user_metadata` de Supabase Auth.

### Qué construir

#### Backend

**1. Leer `role` desde `user_metadata` de Supabase Auth y sincronizarlo a `profiles`**

En `auth.controller.ts`, en el handler de `googleLogin` (y en `register`), cuando se hace el INSERT/UPSERT en `profiles`, incluir el campo `role` tomándolo de `user_metadata`:

```typescript
// En googleLogin, al crear un nuevo perfil:
const role = (metadata.role as string) ?? 'user';
await supabase.from('profiles').insert({
  id: data.user.id,
  email,
  full_name: ...,
  role   // nuevo campo
});
```

**2. Endpoint de Apple Sign-In**

Agregar a `auth.controller.ts`:

```typescript
export const appleLogin = asyncHandler(async (req, res) => {
  const { identityToken } = req.body as { identityToken?: string };
  if (!identityToken) throw new ApiError(400, 'identityToken is required');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken
  });

  if (error) throw new ApiError(error.status ?? 401, error.message);
  if (!data.user || !data.session?.access_token) throw new ApiError(401, 'Apple auth failed');

  // Misma lógica que googleLogin: verificar si el perfil existe, crear si no
  ...

  res.json({ access_token: data.session.access_token, isNewUser });
});
```

Agregar a `auth.routes.ts`: `authRouter.post('/apple', appleLogin);`

**3. Endpoint de actualización de tipo de piel (CRÍTICO-01)**

Agregar a `profile.controller.ts` (completar el módulo que tiene TODOs):

```typescript
export const updateSkinType = asyncHandler(async (req, res) => {
  const { skinType, ageRange, imperfections, mainGoal, routineSteps } = req.body;
  const userId = req.user.id;

  // UPSERT en skin_profiles — reemplaza el registro existente
  const { data, error } = await supabase
    .from('skin_profiles')
    .upsert(
      { user_id: userId, skin_type: skinType, age_range: ageRange,
        imperfections, main_goal: mainGoal, routine_steps: routineSteps },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.json({ skinProfile: data });
});
```

Agregar a `profile.routes.ts`: `profileRouter.put('/skin-type', authenticate, updateSkinType);`

Implementar también los TODOs del `profile.repository.ts` (`findByUserId`, `update`) usando el patrón de los otros repositories.

#### Frontend

**Apple Sign-In:**
- Instalar: `npx expo install expo-apple-authentication`
- Crear `services/appleAuth.ts` con la lógica de `AppleAuthentication.signInAsync()` y llamada a `POST /api/auth/apple`.
- Agregar botón de Apple en `app/(auth)/login.tsx` y `app/(auth)/register.tsx` (solo visible en iOS: `Platform.OS === 'ios'`).
- Seguir el mismo patrón que el botón de Google existente.

**Actualización de tipo de piel:**
- Nueva pantalla: `app/(tabs)/profile/edit-skin-type.tsx`
- Reutilizar los componentes del quiz (`app/quiz.tsx`) para mostrar las mismas opciones pre-seleccionadas con el valor actual.
- Llamar a `PUT /api/profile/skin-type` con los nuevos valores.
- Agregar enlace "Editar mi tipo de piel" en `app/(tabs)/profile.tsx`.

### Tests

Archivo: `backend/src/modules/auth/tests/auth.apple.test.ts`

```typescript
// Patrón: jest.mock('../../config/supabase', ...) → mismo patrón que products.service.test.ts
describe('Apple Sign-In', () => {
  it('retorna 400 si falta identityToken', ...)
  it('retorna 401 si Supabase rechaza el token', ...)
  it('crea perfil para usuario nuevo', ...)
  it('no duplica perfil para usuario existente', ...)
});
```

Archivo: `backend/src/modules/profile/tests/profile.service.test.ts`

```typescript
describe('updateSkinType', () => {
  it('hace upsert correctamente en skin_profiles', ...)
  it('retorna 400 si falta skinType', ...)
});
```

### Contrato de interfaz que expone este módulo

```typescript
// Endpoint:  POST /api/auth/apple       → { access_token: string, isNewUser: boolean }
// Endpoint:  PUT  /api/profile/skin-type → { skinProfile: SkinProfileRow }
// DB:        profiles.role               → 'user' | 'specialist' | 'center_admin'
```

---

## Módulo 2 — Push Notifications Remotas

**Rama sugerida:** `feature/e2-push-notifications`

### Contexto de partida

- `services/notifications.ts` ya implementa scheduling **local** con `expo-notifications`.
- Los recordatorios se muestran en el home con toggle (on/off).
- No hay tokens de push registrados en el backend ni envío remoto.
- La tabla `push_tokens` se crea en la migración E2.

### Qué construir

#### Backend — nuevo módulo `notifications`

Crear `backend/src/modules/notifications/` con el patrón estándar (routes/controller/service/repository/tests).

**`notifications.repository.ts`**
```typescript
export const notificationsRepository = {
  upsertToken: async (userId: string, expoToken: string, platform: string) => {
    // UPSERT en push_tokens (onConflict: 'user_id')
  },
  deleteToken: async (userId: string) => { ... },
  findTokensByUserIds: async (userIds: string[]): Promise<PushTokenRow[]> => { ... },
  findTokenByUserId: async (userId: string): Promise<PushTokenRow | null> => { ... }
};
```

**`notifications.service.ts`**

```typescript
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

export const notificationsService = {
  registerToken: async (userId: string, expoToken: string, platform: string) => {
    return notificationsRepository.upsertToken(userId, expoToken, platform);
  },

  // Enviar una notificación puntual a un usuario
  sendToUser: async (userId: string, title: string, body: string, data?: Record<string, string>) => {
    const tokenRow = await notificationsRepository.findTokenByUserId(userId);
    if (!tokenRow) return; // usuario sin token registrado → silenciar

    await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ to: tokenRow.expo_token, title, body, data: data ?? {} }])
    });
  }
};
```

**`notifications.controller.ts`** — endpoints:
```
POST /api/notifications/token        → registrar/actualizar token (authenticate)
DELETE /api/notifications/token      → desregistrar al hacer logout (authenticate)
POST /api/notifications/send         → uso interno (service role, NO exponer al cliente)
```

**Scheduler (cron job)**

Agregar a `backend/src/server.ts` o en un archivo `backend/src/jobs/notification.job.ts`:

```typescript
import cron from 'node-cron';

// Correr cada minuto; evaluar si algún usuario tiene recordatorio en este momento
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  // Buscar usuarios con notifications_enabled=true y reminder_time=currentTime
  // Para cada uno: verificar si tiene rutina activa del día → enviar push
  // Implementar con una query a profiles JOIN con routines
});
```

Instalar: `npm install node-cron && npm install -D @types/node-cron`

#### Frontend — actualizar `services/notifications.ts`

Agregar al archivo existente:

```typescript
// Registrar el token de Expo Push en el backend al hacer login
export async function registerPushToken(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  });

  await apiRequest({
    path: '/notifications/token',
    method: 'POST',
    body: JSON.stringify({
      expoToken: tokenData.data,
      platform: Platform.OS
    })
  });
}

// Llamar desde services/auth.ts después del login exitoso
```

Agregar en `app/(tabs)/home.tsx` la opción de configurar horario de recordatorios. Persistir el horario en `profiles` (necesita columnas `notification_morning` y `notification_evening` — agregar a la migración E2 si se quiere guardar del lado servidor, o mantener local con `AsyncStorage` si se prefiere no ampliar el schema).

### Tests

Archivo: `backend/src/modules/notifications/tests/notifications.service.test.ts`

```typescript
describe('notificationsService', () => {
  it('registra un token nuevo correctamente', ...)
  it('actualiza el token si el usuario ya tiene uno', ...)
  it('no falla si el usuario no tiene token al enviar', ...)
  it('llama a la Expo Push API con el payload correcto', ...)
});
```

### Contrato de interfaz que expone este módulo

```typescript
// Endpoint: POST /api/notifications/token    → 200 OK
// Endpoint: DELETE /api/notifications/token  → 204 No Content
// Función interna (service-to-service):
//   notificationsService.sendToUser(userId, title, body, data?)
//   → usada por Módulo 4 (rutina asignada) y Módulo 5 (mensaje nuevo)
```

---

## Módulo 3 — Sistema de Roles y Registro de Especialista
 

> **Nota:** Si el integrante 5 ya tiene M1, este módulo puede asignarse al integrante 4 (que tiene progreso, el más completo en E1 con tests) o al integrante 3. La decisión la toma el equipo. Lo importante es que este módulo **no depende de M1** para empezar: la columna `role` en `profiles` ya la agrega la migración E2.

**Rama sugerida:** `feature/e2-roles-specialist-register`

### Contexto de partida

- El campo `role` se pasa en el registro pero no hay enforcement en el backend.
- El middleware `authenticate` solo setea `req.user.id`; no incluye `req.user.role`.
- `types/user.ts` ya define `UserRole = 'user' | 'specialist' | 'center_admin'`.

### Qué construir

#### Backend

**1. Extender el middleware `authenticate`**

En `backend/src/middlewares/auth.middleware.ts`, después de validar el JWT, leer el `role` desde la tabla `profiles` y agregarlo a `req.user`:

```typescript
// Extender express.d.ts para incluir role
req.user = {
  id: data.user.id,
  role: profile?.role ?? 'user'
};
```

Actualizar `backend/src/types/express.d.ts`:
```typescript
declare namespace Express {
  interface Request {
    user: { id: string; role: string };
  }
}
```

**2. Middleware `requireRole`**

Crear `backend/src/middlewares/requireRole.middleware.ts`:

```typescript
import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const requireRole = (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(403, 'No tenés permiso para acceder a este recurso.');
    }
    next();
  };
```

**3. Nuevo módulo `specialist` en backend**

Crear `backend/src/modules/specialist/` con el patrón estándar.

**`specialist.service.ts`** — lógica de registro:

```typescript
export const specialistService = {
  register: async (userId: string, body: SpecialistRegisterBody, files: SpecialistFiles) => {
    // 1. Verificar que license_number no exista ya en specialist_profiles
    const { data: existing } = await supabase
      .from('specialist_profiles')
      .select('id')
      .eq('license_number', body.licenseNumber)
      .maybeSingle();

    if (existing) throw new ApiError(409, 'Ese número de matrícula ya está registrado.');

    // 2. Subir foto del DNI y foto del título a Supabase Storage (bucket 'specialist-docs')
    const dniUrl = await uploadSpecialistDoc(userId, files.dniPhoto, 'dni');
    const titleUrl = await uploadSpecialistDoc(userId, files.titlePhoto, 'titulo');

    // 3. INSERT en specialist_profiles con license_status='pending'
    const { data, error } = await supabase
      .from('specialist_profiles')
      .insert({
        user_id: userId,
        specialty: body.specialty,
        license_number: body.licenseNumber,
        dni_photo_url: dniUrl,
        title_photo_url: titleUrl,
        license_status: 'pending'
      })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return data;
  },

  getStatus: async (userId: string) => {
    const { data } = await supabase
      .from('specialist_profiles')
      .select('license_status, rejection_reason, specialty, license_number')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  }
};
```

**Endpoints del módulo specialist:**
```
POST   /api/specialist/register         → subir docs + crear specialist_profile (authenticate)
GET    /api/specialist/status           → ver estado de matrícula (authenticate + role=specialist)
GET    /api/specialist/health           → health check
```

**Subida de documentos:**

Usar `multer` (ya instalado) con `memoryStorage`. Crear bucket `specialist-docs` en Supabase Storage con acceso privado (las fotos de DNI no son públicas).

```typescript
// Path: {userId}/dni/{timestamp}.jpg  y  {userId}/titulo/{timestamp}.jpg
```

#### Frontend

**Pantalla de registro de especialista:**

Modificar `app/(auth)/register.tsx` para agregar un paso condicional cuando `role === 'specialist'`:

```
Paso 1 (todos): nombre, email, contraseña, toggle "Soy especialista"
Paso 2 (solo specialist): especialidad, número de matrícula
Paso 3 (solo specialist): foto DNI (expo-image-picker), foto del título
```

Enviar como `multipart/form-data` (igual que el upload de fotos de productos).

**Pantalla de estado de matrícula:**

Nueva pantalla `app/specialist-status.tsx`:
- Se muestra al hacer login si `role === 'specialist'` y `license_status === 'pending'` o `'rejected'`.
- Muestra el estado actual con ícono y mensaje.
- Si fue rechazado, muestra el motivo.

**Navegación diferenciada por rol:**

En `app/_layout.tsx` o `app/(tabs)/_layout.tsx`, leer el rol del perfil almacenado en `SecureStore` y redirigir:
- `user` → tabs actuales (home, rutina, productos, progreso, perfil)
- `specialist` con status `verified` → tabs de especialista (clientes, chat, perfil)
- `specialist` con status `pending`/`rejected` → pantalla de estado de matrícula

### Tests

Archivo: `backend/src/modules/specialist/tests/specialist.service.test.ts`

```typescript
describe('specialistService.register', () => {
  it('lanza 409 si el número de matrícula ya existe', ...)
  it('crea el specialist_profile con status pending', ...)
  it('sube los documentos al bucket correcto', ...)
});

describe('requireRole middleware', () => {
  it('permite el acceso si el rol coincide', ...)
  it('lanza 403 si el rol no coincide', ...)
  it('lanza 403 si no hay usuario autenticado', ...)
});
```

### Contrato de interfaz que expone este módulo

```typescript
// DB: profiles.role                    → leído por todos los módulos vía middleware
// DB: specialist_profiles.license_status → leído por M4 y M5
// Middleware: requireRole('specialist')  → usado por M4 para proteger endpoints del panel
// Endpoint: GET /api/specialist/status  → usado por el frontend para mostrar estado
```

---

## Módulo 4 — Panel del Especialista y Asignación de Rutinas

**Responsable:** Integrante 2 (ya tiene rutinas en E1)  
**Rama sugerida:** `feature/e2-specialist-panel`

### Prerequisito

La migración E2 debe estar ejecutada (tabla `client_specialist_relations`, columna `routines.assigned_by`).
Módulo 3 debe haber implementado el middleware `requireRole` y el campo `profiles.role`.

Para desarrollar en paralelo: mockear `req.user.role = 'specialist'` con el `mockAuth` existente y trabajar con datos de seed.

### Qué construir

#### Backend — nuevo módulo `specialist-panel`

Crear `backend/src/modules/specialist-panel/` con el patrón estándar.

**Endpoints:**

```
GET  /api/specialist-panel/clients
     → lista de perfiles de clientes vinculados al especialista autenticado
     → JOIN client_specialist_relations → profiles → skin_profiles
     → requireRole('specialist')

GET  /api/specialist-panel/clients/:clientId
     → detalle: tipo de piel (skin_profiles), historial últimas 4 semanas (routine_logs)
     → verificar que client_specialist_relations existe y está activa

GET  /api/specialist-panel/clients/:clientId/routines
     → rutinas asignadas por este especialista al cliente
     → WHERE assigned_by = req.user.id AND user_id = clientId

POST /api/specialist-panel/clients/:clientId/routines
     → crear rutina asignada (campo assigned_by = req.user.id, user_id = clientId)
     → reutilizar routinesRepository.create()
     → después de crear: llamar a notificationsService.sendToUser(clientId, 'Nueva rutina', ...)

PUT  /api/specialist-panel/clients/:clientId/routines/:routineId
     → editar solo si assigned_by = req.user.id (verificar antes de update)

DELETE /api/specialist-panel/clients/:clientId/routines/:routineId
     → eliminar solo si assigned_by = req.user.id

GET  /api/specialist-panel/health
```

**`specialist-panel.service.ts`** — lógica clave:

```typescript
// Verificar que el especialista tiene acceso al cliente
async function assertRelation(specialistId: string, clientId: string) {
  const { data } = await supabase
    .from('client_specialist_relations')
    .select('id')
    .eq('specialist_id', specialistId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) throw new ApiError(403, 'No tenés acceso a este cliente.');
}
```

#### Frontend — tabs de especialista

Crear `app/(tabs-specialist)/` (nueva carpeta con su propio `_layout.tsx`):

```
app/(tabs-specialist)/
├── _layout.tsx        → TabLayout para el especialista (tabs: clientes, chat, perfil)
├── clients.tsx        → lista de clientes vinculados
└── client/[id].tsx    → detalle: historial, tipo de piel, botón "Asignar rutina"
```

En el detalle de cliente (`client/[id].tsx`):
- Mostrar tipo de piel con el mismo componente visual del quiz.
- Mostrar los últimos 30 días de progreso (resumen simplificado, datos de read-only).
- Botón "Asignar nueva rutina" → reutilizar el wizard de rutinas existente, pasando `clientId` como param.

En el wizard de rutinas (`app/routine/Create.tsx` y siguientes), detectar si viene un `clientId` en los params:
- Si hay `clientId`: el `user_id` de la rutina creada es `clientId` y se agrega `assigned_by`.
- Si no: comportamiento actual.

**Diferenciación visual** de rutinas asignadas por especialista en `app/(tabs)/routine.tsx`:
- Si `routine.assigned_by !== null` → mostrar badge "Asignada por tu especialista".
- El cliente puede marcar los pasos pero no puede editar ni eliminar la rutina.

### Tests

Archivo: `backend/src/modules/specialist-panel/tests/specialist-panel.service.test.ts`

```typescript
describe('getClients', () => {
  it('retorna solo los clientes vinculados al especialista', ...)
  it('retorna lista vacía si no tiene clientes', ...)
});

describe('createAssignedRoutine', () => {
  it('crea rutina con user_id=clientId y assigned_by=specialistId', ...)
  it('lanza 403 si el especialista no tiene relación activa con el cliente', ...)
  it('dispara notificación push al cliente', ...)
});

describe('deleteAssignedRoutine', () => {
  it('lanza 403 si el especialista intenta borrar una rutina que no asignó él', ...)
  it('elimina correctamente si es el asignador', ...)
});
```

### Contrato de interfaz que expone este módulo

```typescript
// Endpoint: POST /api/specialist-panel/clients/:clientId/routines
//   → internamente llama notificationsService.sendToUser() (Módulo 2)
// DB: routines.assigned_by → leído por el frontend para mostrar badge
// DB: client_specialist_relations → escrito por M5, leído aquí
```

---

## Módulo 5 — Buscador de Especialistas, Vinculación y Chat

**Responsable:** Integrante 3 (ya tiene productos con storage en E1)  
**Rama sugerida:** `feature/e2-specialists-chat`

### Prerequisito

La migración E2 debe estar ejecutada (tablas `specialist_profiles`, `client_specialist_relations`, `chat_messages`).
Módulo 3 debe haber creado al menos un especialista con `license_status='verified'` como seed de prueba.

### Qué construir

#### Backend — dos submódulos dentro de la misma carpeta

`backend/src/modules/specialists/` — búsqueda y vinculación  
`backend/src/modules/chat/` — mensajería

**Endpoints de specialists:**

```
GET  /api/specialists?specialty=dermatologo&name=garcia
     → lista de perfiles con specialist_profiles.license_status='verified'
     → JOIN profiles (nombre, foto) + specialist_profiles (specialty)
     → filtros opcionales por specialty y nombre (ILIKE '%garcia%')
     → NO requiere autenticación para ver el listado

POST /api/specialists/link
     body: { specialistId: string }
     → el cliente se vincula a un especialista
     → si ya tiene relación activa → cambiar status='inactive' la anterior
     → INSERT nueva relación con status='active'
     → authenticate + requireRole('user')

DELETE /api/specialists/link
     → desvincularse del especialista actual
     → UPDATE status='inactive' en la relación activa del cliente

GET /api/specialists/my-specialist
     → devuelve el especialista vinculado al cliente autenticado (o null)

GET /api/specialists/health
```

**Endpoints de chat:**

```
GET  /api/chat/messages?limit=50&before=<timestamp>
     → historial de mensajes paginado de la relación activa del cliente
     → authenticate

POST /api/chat/messages
     body: { content: string }
     → INSERT en chat_messages con sender_id = req.user.id
     → después del INSERT: llamar a notificationsService.sendToUser() al otro participante
     → authenticate

PATCH /api/chat/messages/read
     → marcar como leídos los mensajes donde el receptor es req.user.id
     → UPDATE read_at = now() WHERE relation_id = <activa> AND sender_id != req.user.id AND read_at IS NULL

GET  /api/chat/health
```

#### Frontend

**Buscador de especialistas:**

Nueva pantalla en la navegación del cliente:
```
app/(tabs)/specialists.tsx       → listado con barra de búsqueda y filtro por especialidad
app/specialists/[id].tsx         → perfil del especialista + botón "Elegir como mi especialista"
```

**Chat:**

```
app/chat.tsx                     → chat 1-a-1 con el especialista vinculado
```

Implementar Realtime con Supabase en el frontend para actualizaciones en tiempo real:

```typescript
// En el hook del chat (hooks/useChat.ts)
import { supabase } from '@/lib/supabase'; // crear cliente Supabase en el frontend

useEffect(() => {
  const channel = supabase
    .channel(`chat:${relationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `relation_id=eq.${relationId}` },
      (payload) => setMessages(prev => [...prev, payload.new as ChatMessage])
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [relationId]);
```

**Nota:** Para Realtime en el frontend se necesita el cliente Supabase JS (no pasa por el backend Express). Crear `services/supabase.ts` con el cliente `createClient(url, anonKey)`.

### Fix CRÍTICO-02 — Protección al eliminar producto en uso

Este fix va en el módulo de productos ya existente. El integrante 3 (responsable de productos en E1) lo implementa dentro de este módulo de E2.

**Cambio en `products.service.ts`:**

```typescript
remove: async (productId: string, userId: string) => {
  // 1. Verificar si el producto está en algún paso de una rutina activa
  const { data: usages, error: usageError } = await supabase
    .from('routine_step_products')
    .select(`
      id,
      routine_steps (
        id, name,
        routines ( id, name, is_active )
      )
    `)
    .eq('product_id', productId);

  if (usageError) throw new ApiError(500, usageError.message);

  const activeUsages = (usages ?? []).filter(
    (u: any) => u.routine_steps?.routines?.is_active === true
  );

  if (activeUsages.length > 0) {
    // Retornar 409 con detalle para que el frontend muestre el diálogo
    throw new ApiError(409, 'El producto está en uso en rutinas activas.', {
      affectedRoutines: activeUsages.map((u: any) => ({
        routineId: u.routine_steps.routines.id,
        routineName: u.routine_steps.routines.name,
        stepName: u.routine_steps.name
      }))
    });
  }

  await productsRepository.remove(productId, userId);
},

// Nuevos métodos en el service:
forceRemove: async (productId: string, userId: string) => {
  // Eliminar de routine_step_products y luego de products
  await supabase.from('routine_step_products').delete().eq('product_id', productId);
  await productsRepository.remove(productId, userId);
},

replaceInRoutines: async (productId: string, replacementId: string, userId: string) => {
  // Actualizar routine_step_products cambiando product_id
  await supabase
    .from('routine_step_products')
    .update({ product_id: replacementId })
    .eq('product_id', productId);
  await productsRepository.remove(productId, userId);
}
```

**Actualizar `ApiError.ts`** para que acepte un campo `details` opcional (para pasar la lista de rutinas afectadas).

**Nuevos endpoints en `products.routes.ts`:**
```
DELETE /api/products/:id/force    → forceRemove (authenticate)
PUT    /api/products/:id/replace  → body: { replacementProductId } (authenticate)
```

**Frontend — modal de confirmación:**

En `app/products/[id].tsx`, al presionar eliminar:
1. Llamar a `DELETE /api/products/:id`
2. Si responde 200 → eliminado, ir hacia atrás
3. Si responde 409 → mostrar `Modal` con:
   - Lista de rutinas afectadas
   - Botón "Quitar de mis rutinas" → llamar a `DELETE /api/products/:id/force`
   - Botón "Reemplazar por..." → abrir selector de productos → llamar a `PUT /api/products/:id/replace`
   - Botón "Cancelar"

### Tests

Archivo: `backend/src/modules/specialists/tests/specialists.service.test.ts`

```typescript
describe('getSpecialists', () => {
  it('retorna solo especialistas con license_status=verified', ...)
  it('filtra por especialidad si se pasa el parámetro', ...)
  it('filtra por nombre con búsqueda parcial', ...)
});

describe('linkSpecialist', () => {
  it('crea relación activa si el cliente no tiene ninguna', ...)
  it('desactiva la relación anterior y crea una nueva si ya tenía especialista', ...)
  it('lanza error si el especialista no está verificado', ...)
});
```

Archivo: `backend/src/modules/chat/tests/chat.service.test.ts`

```typescript
describe('sendMessage', () => {
  it('inserta el mensaje correctamente', ...)
  it('lanza error si el cliente no tiene relación activa', ...)
  it('dispara notificación push al destinatario', ...)
});
```

Archivo: `backend/src/modules/products/tests/products.service.test.ts` (extender el existente)

```typescript
describe('remove — protección CRÍTICO-02', () => {
  it('elimina directamente si el producto no está en ninguna rutina activa', ...)
  it('lanza 409 con lista de rutinas si el producto está en uso', ...)
});

describe('forceRemove', () => {
  it('elimina de routine_step_products y luego el producto', ...)
});

describe('replaceInRoutines', () => {
  it('actualiza el product_id en routine_step_products y elimina el original', ...)
});
```

### Contrato de interfaz que expone este módulo

```typescript
// DB: client_specialist_relations → escrito aquí, leído por M4 (panel)
// Endpoint: POST /api/specialists/link → establece vínculo que M4 necesita para mostrar clientes
// Supabase Realtime en chat_messages → el frontend se suscribe directamente
```

---

## Resumen de independencia entre módulos

```
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE (DB + Auth + Storage + Realtime)      │
└───┬──────────────┬──────────────┬──────────────┬─────────────────┘
    │              │              │              │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
│  M1   │    │   M3    │   │   M4    │   │   M5    │
│Apple  │    │Roles +  │   │ Panel   │   │Buscador │
│Sign-In│    │Specialist│  │ Esp.    │   │ + Chat  │
│SkinTyp│    │Register │   │Asignar  │   │ Link    │
└───────┘    └─────────┘   └────┬────┘   └────┬────┘
                                │              │
                          notif.sendToUser()   │
                                │              │
┌───────────────────────────────▼──────────────▼──────┐
│                         M2                           │
│              Push Notifications Service              │
│         (notificationsService.sendToUser)            │
└──────────────────────────────────────────────────────┘
```

**Regla de dependencia:** M4 y M5 llaman a `notificationsService.sendToUser()` (M2) vía importación directa del service. No hay llamadas HTTP entre módulos. Todos los demás intercambios de datos son a través de Supabase directamente.

---

## Tabla de contratos entre módulos

| Qué | Produce | Consume | Tipo |
|-----|---------|---------|------|
| `profiles.role` | M1 (al crear perfil) / M3 (migration) | M3 (middleware), M4, M5 | Columna DB |
| `specialist_profiles.license_status` | M3 | M5 (filtro buscador), M3 frontend (pantalla estado) | Columna DB |
| `client_specialist_relations` | M5 (INSERT al linkear) | M4 (SELECT para ver clientes) | Tabla DB |
| `routines.assigned_by` | M4 (al asignar) | Frontend de rutinas (badge) | Columna DB |
| `requireRole middleware` | M3 | M4, M5 (en sus routes) | Middleware Express |
| `notificationsService.sendToUser()` | M2 | M4 (rutina asignada), M5 (mensaje nuevo) | Import directo de service |
| `push_tokens` | M2 (registro al login) | M2 (scheduler y sendToUser) | Tabla DB |

---

## Proceso de revisión de lógica antes de codificar

Antes de escribir código de un módulo nuevo, el integrante responsable debe:

1. **Leer este archivo completo** y la sección de su módulo.
2. **Leer `database/e2_schema.sql`** y verificar que las tablas que va a usar ya existen en Supabase.
3. **Verificar `database/tableNames.ts`** — si agrega una tabla nueva, agregarla aquí primero.
4. **Verificar `database/schema.types.ts`** — si hay tipos nuevos que necesita, regenerar desde Supabase o agregar manualmente.
5. **Correr `npm test`** en el backend para confirmar que los tests de E1 siguen pasando antes de tocar código existente.
6. **Correr los health checks** del backend antes y después de cada cambio en routes o middlewares existentes.
7. **Antes de hacer PR**: confirmar con el responsable del módulo adyacente que las interfaces compartidas están alineadas.

---

## Convenciones que aplican a todos los módulos de E2

Las mismas que en E1 más estas adiciones:

- Nuevos módulos de backend siguen estrictamente el patrón: `routes → controller → service → repository → tests`.
- Los tests se escriben en español, siguiendo el patrón de los tests existentes (`jest.mock`, factory functions con `make*`).
- Los nuevos endpoints de especialista usan `requireRole('specialist')` de M3.
- El bucket `specialist-docs` es privado (signed URLs si se necesita mostrar las fotos).
- El scheduler de notificaciones (M2) usa el service role key de Supabase, nunca el anon key.
- El cliente Supabase JS en el frontend (para Realtime de M5) usa el anon key con las políticas RLS habilitadas.
- Las pantallas nuevas agregan su ruta a `constants/routes.ts`.
- Los colores nuevos van a `constants/colors.ts`.

---

## Skills sugeridas (para confirmar con el equipo)

Las siguientes skills podrían agregarse a `docs/` o al sistema de skills del proyecto para acelerar el trabajo en E2:

### Skill: `supabase-realtime`
**Propósito:** Guía paso a paso para habilitar Realtime en una tabla de Supabase y suscribirse desde el frontend con el cliente JS. Incluye el patrón de canal filtrado por `relation_id` y manejo de cleanup en `useEffect`.  
**Cuándo usarla:** Al implementar el chat de M5.

### Skill: `expo-push-notifications`
**Propósito:** Instrucciones para obtener el Expo Push Token, registrarlo en el backend y enviarlo vía la Expo Push API. Incluye las diferencias entre desarrollo (Expo Go) y producción (EAS Build) para los tokens.  
**Cuándo usarla:** Al implementar M2 (requiere `projectId` del `app.json` configurado).

### Skill: `specialist-seed`
**Propósito:** Script SQL para crear datos de seed en Supabase: un usuario con `role='specialist'` y `license_status='verified'` listo para usar en desarrollo de M4 y M5, sin tener que pasar por el flujo de registro y verificación manual.  
**Cuándo usarla:** Al inicio de M4 y M5 para tener datos disponibles independientemente de M3.

### Skill: `multipart-specialist-docs`
**Propósito:** Guía para enviar fotos de DNI y título como `multipart/form-data` desde el frontend React Native (usando `FormData`) al backend Express (usando `multer`). Incluye el patrón ya usado en productos para reutilizar.  
**Cuándo usarla:** Al implementar el formulario de registro de especialista en M3.

