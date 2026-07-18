# E3 Contracts

## M1 - Rutinas Avanzadas

M1 consume el contrato de auditoria de M4 en modo best-effort para registrar cambios de pasos.

### Audit

`createRoutine`, `updateRoutine`, `createStep`, `updateStep` y `deleteStep` (todos en `backend/src/modules/routines/routines.service.ts`) emiten a traves de una unica funcion `recordRoutineAudit`, que **consolida en un solo registro de `audit_logs`** toda la actividad sobre una misma rutina dentro de una ventana de **3 minutos** (`ROUTINE_BATCH_WINDOW_MS`), en vez de generar una fila por cada llamada al backend.

Por que: el wizard de creacion (`Step2` crea la rutina, `Step3` hace `PATCH` del horario, `Add-step.tsx` hace `POST` una vez por paso) generaba 3+ registros distintos para lo que el usuario percibe como una unica accion de "crear la rutina". Antes de este fix, ademas, solo los pasos pasaban por un mecanismo de consolidacion — `createRoutine`/`updateRoutine` emitian siempre una fila nueva.

Mecanismo (`recordRoutineAudit`):

1. Busca la fila mas reciente con `entity='routine'`, `entity_id=routineId`, `actor_id=actorId`, `metadata->>changeType='routine_batch'`, `action != 'delete'`, `created_at >= now() - 3min` (`auditRepository.findRecentRoutineBatch`).
2. Si existe, fusiona el cambio actual (`auditRepository.updateRoutineBatch`): si es un cambio de la rutina en si (`routineChange`), pisa `metadata.routine.after` (conserva el `before` original de la fila); si es un cambio de paso (`stepChange`), hace `push` a `metadata.steps` — **sin limite de cantidad de pasos**. Refresca `created_at` (ventana deslizante) pero no cambia el `action` de la fila.
3. Si no existe, inserta una fila nueva con `action` = la accion de ese cambio puntual.

`deleteRoutine` **no pasa por este mecanismo** — sigue llamando a `recordAuditLog` directo con su propia fila `action: 'delete'` (una baja es un evento terminal, no debe mezclarse con historial de creacion/edicion).

Shape de `metadata` (`changeType: 'routine_batch'`):

```ts
{
  changeType: 'routine_batch',
  assignedBy?: string,                                  // solo si vino de assignRoutineToPatient (M3-especialista)
  routine?: { before?: RoutineRow; after: RoutineRow },  // snapshot de la rutina en si
  steps: Array<{
    stepId: string | null;
    stepName: string | null;
    category: string | null;
    before?: RoutineStepRow;
    after?: RoutineStepRow;
  }>
}
```

Retrocompatibilidad de lectura (`audit.service.ts`, `getRoutineBatchMetadata`): filas guardadas antes de este fix con `changeType: 'routine_step_batch'` (fix anterior, solo pasos consolidados) o `changeType: 'routine_step'` (formato original, una fila por paso) se siguen interpretando correctamente — se normalizan a la misma forma interna, solo que sin `routine`.

La auditoria no bloquea el flujo principal si falla (try/catch interno en `recordRoutineAudit`, ademas del best-effort de `recordAuditLog`).

## M2 - Identidad y Perfil (emisores agregados por M4 ante ausencia de dueño)

No hay un modulo `auth`/`profile` dueño de E3 activo, asi que M4 instrumento directamente estos flujos para que T4.6 (auditoria de usuarios/especialistas) tuviera datos reales — antes de esto, `entity: 'user_profile'` y `entity: 'specialist_profile'` nunca se emitian y el panel quedaba vacio para esos filtros.

- `backend/src/modules/auth/auth.service.ts` (`authService.register`) → `entity: 'user_profile'`, `action: 'create'`, `actorId` es el propio usuario recien creado.
- `backend/src/modules/profile/profile.service.ts` (`updateMyProfile`) → `entity: 'user_profile'`, `action: 'update'`, con `before`/`after` (ya obtenia el `before` para su propia logica).
- `backend/src/modules/specialists/specialists.registration.service.ts` (`specialistsRegistrationService.register`) → `entity: 'specialist_profile'`, `action: 'create'`, `entityId` es el id de la fila `specialist_profiles` (no el `userId`).
- `backend/src/modules/admin/admin.service.ts` (`updateSpecialistStatus`) → `entity: 'specialist_profile'`, `action: 'approve'` \| `'reject'`, con `before` obtenido via `adminRepository.findSpecialistById` (no existia antes de este cambio) y `after` la fila actualizada.

Agregados en una vuelta posterior (cobertura de eventos faltantes reportados por QA manual):

- `backend/src/modules/quiz/quiz.controller.ts` (`saveQuiz`) → `entity: 'skin_profile'`, `action: 'create'`, con `before` = ultimo `skin_profiles` del usuario (si existia) y `metadata: { changeType: 'skin_quiz_retake' }` cuando es un reintento (no la primera vez que hace el test).
- `backend/src/modules/specialists/specialists.directory.service.ts` (`linkSpecialist`) → `entity: 'specialist_relation'`, `action: 'create'`, `actorId` es el cliente (`actorRole: 'user'`). No emite si el cliente ya estaba vinculado al mismo especialista (early return sin cambios).
- `backend/src/modules/specialists/specialists.directory.service.ts` (`unlinkSpecialist`) → `entity: 'specialist_relation'`, `action: 'delete'`, solo si habia una relacion activa (`before` = esa relacion).

**Todavia sin cubrir**: login exitoso/fallido y cambio explícito de rol (`action: 'login'` / `'role_change'` definidos en el contrato pero nunca emitidos). Ver T4.6 en `docs/plan_entrega3.md`.

## M3 - Centros Esteticos y Tablero Admin

M3 publica el contrato de centros usado por pantallas admin y por modulos posteriores de reportes.

### Database

Owned by M3:

```text
centers
center_admins
specialist_profiles.center_id
```

Contrato:

```text
centers(
  id uuid primary key,
  name text not null,
  address text null,
  phone text null,
  is_active boolean not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

center_admins(
  id uuid primary key,
  user_id uuid references profiles(id),
  center_id uuid references centers(id),
  role text not null default 'center_admin',
  created_at timestamptz not null
)

specialist_profiles.center_id uuid null references centers(id)
```

### Backend Endpoints

```text
GET    /api/centers
POST   /api/centers
PATCH  /api/centers/:centerId
DELETE /api/centers/:centerId
GET    /api/centers/:centerId/dashboard
PATCH  /api/admin/specialists/:specialistId/center
```

### Permissions

Todos los endpoints requieren usuario autenticado con rol `center_admin`.

El scope de centro se define por `center_admins`; un admin solo puede operar centros asociados a su `user_id`.

### Dashboard

M3 expone solo contadores basicos:

```ts
{
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
}
```

No incluye modulo M5 de reportes avanzados, filtros de fecha o exportes.

### Audit

`backend/src/modules/centers/centers.service.ts` emite `recordAuditLog` en los 3 flujos de escritura, `entity: 'center'`:

- `createCenter` → `action: 'create'`, `after` = fila creada.
- `updateCenter` → `action: 'update'`, `before`/`after` = fila antes/despues del update (el `before` ya se obtenia via `ensureAdminCanAccessActiveCenter`, sin queries extra).
- `deleteCenter` → `action: 'delete'`, `before` = fila antes del soft delete.

`assignRoutineToPatient` (`backend/src/modules/specialists/specialists.directory.service.ts`) llama a `routinesService.createRoutine` con el `actorId`/`actorRole` del especialista, asi que la asignacion de rutina queda cubierta por el mismo mecanismo de M1 (ver seccion M1 arriba), con `metadata.assignedBy` distinguiendola de una alta hecha por el propio usuario.

## M5 - Planes y Suscripciones

Fecha: 2026-07-02

### Contrato funcional

- `subscription_plans` y `subscriptions` existen para gestion administrativa.
- `subscriptions.status` es informativo en E3.
- E3 no aplica enforcement de acceso por estado de plan.
- `subscription_plans.features` admite capacidades para definir accesos por plan. Campos soportados:
  - `durationDays: number`
  - `chatEnabled: boolean`
  - `chatImagesEnabled: boolean`
  - `videoCallsEnabled: boolean`
  - `maxMonthlyVideoCalls: number`
  - `canAccessGroupSessions: boolean`

### Contrato backend

Endpoints estables para consumo admin:

- `GET /api/admin/subscriptions/plans`
- `POST /api/admin/subscriptions/plans`
- `PATCH /api/admin/subscriptions/plans/:planId`
- `GET /api/admin/subscriptions`
- `POST /api/admin/subscriptions`
- `GET /api/admin/reports?centerId=&from=&to=`

### Contrato de integracion con M3

- Si `centers` y `specialist_profiles.center_id` existen, `GET /api/admin/reports` filtra por `centerId`.
- Si aun no existe ese esquema, el endpoint responde con datos globales y `scopeWarning`.

### Contrato de integracion con M4

- Operaciones de planes y suscripciones emiten `recordAuditLog` en modo best-effort.

## M4 - Auditoria y Seguridad Transversal

### Contrato de emision (ya vigente, consumido por M1/M3/M5)

```ts
// backend/src/modules/audit/audit.service.ts
function recordAuditLog(params: {
  actorId: string; actorRole: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'role_change';
  entity: 'routine' | 'specialist_profile' | 'center' | 'subscription' | 'product' | 'user_profile' | 'skin_profile' | 'specialist_relation';
  entityId: string;
  before?: unknown; after?: unknown; metadata?: Record<string, unknown>;
}): Promise<void>;
```

Best-effort: nunca lanza excepcion, no bloquea el flujo del modulo que lo llama. `skin_profile` y `specialist_relation` son entidades nuevas (no tablas nuevas — `entity` es solo una etiqueta dentro de `audit_logs`, no requiere migracion).

`backend/src/modules/products/products.service.ts` tambien emite `recordAuditLog` con `entity: 'product'`, `action: 'delete'`, en sus 3 flujos de baja (`remove`, `forceRemove` con `metadata.changeType: 'force_remove_detached_from_steps'`, `replaceInRoutines` con `metadata.changeType: 'replaced_in_routines'` + `replacementProductId`). No tenia ningun emisor antes de esta vuelta.

### Contrato de lectura (nuevo)

```text
GET /api/admin/audit-log?entity=&entityId=&actorId=&actorName=&from=&to=&page=&limit=
```

Requiere usuario autenticado con rol `center_admin` (no existe rol `admin`/`platform_admin` en el sistema; se reutiliza el mismo gate que `/api/admin/*` y `/api/centers`).

Query params (todos opcionales):

- `entity`: uno de los valores de `AuditEntity`.
- `entityId` / `actorId`: match exacto por uuid contra `entity_id`/`actor_id`. Se mantienen a nivel de API por compatibilidad, pero la pantalla (`app/(tabs-admin)/audit-log.tsx`) ya no los usa — escribir ahí un texto que no sea un uuid válido rompía la query en Postgres (`invalid input syntax for type uuid`).
- `actorName`: busca por `profiles.full_name` con `ilike` (parcial, case-insensitive) y resuelve internamente a una lista de `actor_id` — es lo que usa la pantalla en el campo "Nombre del actor". Sin coincidencias devuelve una página vacía sin consultar `audit_logs`.
- `from` / `to`: rango de fechas en formato `YYYY-MM-DD`, inclusive, sobre `created_at`. `from` no puede ser posterior a `to`.
- `page`: entero positivo, sin tope (default `1`) — **ojo**: hubo un bug donde `page` se recortaba siempre a `1` (`normalizePositiveInt(rawFilters.page, 1, 1)`, el `1` final era el `max`); si se vuelve a tocar `normalizeFilters`, no reintroducir un `max` bajo ahí.
- `limit`: entero positivo, default `10`, maximo `100`.

Respuesta:

```ts
{
  items: Array<{
    id: string;
    actorId: string | null;
    actorRole: string | null;
    actorName: string;               // resuelto: full_name, o "Administrador de Centro" / "Sistema"
    actorProfile: string | null;     // "Usuario" | "Especialista - {specialty}" | "Administrador de Centro"
    action: string;
    entity: string;
    entityId: string;
    entityLabel: string;             // nombre legible del registro afectado (o el mensaje de "no disponible")
    routineStepDetails: Array<{      // solo si metadata es un lote de rutina con pasos (M1), si no null. Uno por paso, sin limite de cantidad.
      category: string | null;
      stepName: string | null;
      hasProducts: boolean;
    }> | null;
    routineChange: { before: unknown; after: unknown } | null; // solo si metadata es un lote de rutina que incluye cambios de la rutina en si (no solo pasos)
    before: unknown;
    after: unknown;
    metadata: unknown;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

Query params invalidos (fecha con formato incorrecto, `from` > `to`, `page`/`limit` no numericos o no positivos) devuelven `400` con mensaje en espanol.

### Saneamiento de `before`/`after`

El backend no devuelve los snapshots crudos tal cual quedaron guardados en `audit_logs`:

- **`entityLabel`**: se resuelve primero contra la tabla en vivo (por eso una edicion muestra el nombre actual); si el registro ya no existe (caso `delete`), cae a un fallback que deriva el nombre desde el propio `before`/`after` guardado en el evento (`name`, `full_name`, `specialty`, o el plan anidado de una suscripcion), antes de mostrar el mensaje generico de "no disponible".
- **`subscription`**: `owner_id`/`ownerId` se reemplazan por `owner` (nombre resuelto via `profiles` o `centers` segun `owner_type`) — el id crudo del titular no viaja en la respuesta.
- El resto de la limpieza (ocultar `id`, fechas administrativas, `plan_id`, `routine_id`, etc.) se hace en el frontend (`HIDDEN_FIELD_KEYS` en `app/(tabs-admin)/audit-log.tsx`), no en el backend — `before`/`after` siguen trayendo esos campos por si otro consumidor los necesita.

### Frontend

- Pantalla: `app/(tabs-admin)/audit-log.tsx`, accesible desde el panel admin (`app/(tabs-admin)/index.tsx`) y `constants/routes.ts#adminAuditLog`.
- Servicio: `services/audit.ts` (`getAuditLogs`, `getAuditLogErrorMessage`).
- Tipos compartidos: `types/audit.ts`.
- El detalle expandible de cada evento se arma distinto segun `action`, usando `routineChange` en vez de `before`/`after` de la fila cuando esta presente (filas consolidadas de M1 no tienen `before`/`after` a nivel de fila, esos datos viven en `metadata.routine`):
  - `delete`: un solo recuadro con "Elemento eliminado" (actor y fecha ya se muestran arriba, en el meta grid Actor/Perfil/Registro/Fecha de la tarjeta).
  - `create`: un recuadro con los campos de `routineChange.after` (o `after` si no es una fila consolidada) via `FieldValue`, recursivo con bullets para objetos anidados.
  - cualquier otra accion con `before`/`after` (o `routineChange`): dos recuadros, "Antes" y "Despues", solo con los campos que cambiaron.
  - `routineStepDetails` (categoria, nombre de paso, si tiene productos — un bloque por paso, sin limite de cantidad) se muestra en un recuadro aparte, independientemente de `action` — puede convivir en la misma tarjeta junto con el recuadro de creacion/edicion de la rutina cuando ambos ocurrieron en la misma sesion (ver mecanismo de consolidacion en la seccion M1).

### Verificación de seguridad (checklist §7 del plan de Entrega 3)

Última revisión sobre el estado real del código, incluyendo las dos vueltas de cobertura de eventos faltantes (registro/edición de usuarios y especialistas primero; test de piel, rutinas, vínculo con especialista, centros y productos después):

| Item del checklist | Estado | Detalle |
|---|---|---|
| Ruta nueva pasa por `auth.middleware.ts` | ✅ | `auditRouter.use(authenticate)` en `audit.routes.ts`. |
| Ruta con rol específico usa `requireRole.middleware.ts` | ✅ | `requireRole('center_admin')` en el router de auditoría y en `admin.routes.ts`; `profile.routes.ts` no usa `requireRole` porque el chequeo de rol (bloquear a `specialist`) vive en el `service`, no solo en frontend — cumple igual el criterio de fondo. |
| Ningún error expone stack trace/SQL | ✅ | `error.middleware.ts` solo devuelve `message` (y `details` si es un `ApiError` explícito); el log con detalle completo va a consola y solo en `development`. |
| Archivos con URLs firmadas de expiración corta | N/A | El módulo de auditoría no maneja archivos. |
| Endpoint que escribe datos sensibles llama a `recordAuditLog` | ✅ (parcial) | Cubierto: registro/edición de perfil, alta/aprobación/rechazo de especialista, test de piel (creación y reintentos), creación/edición/baja de rutina y sus pasos (consolidados), asignación de rutina por especialista, vínculo/desvínculo con especialista, creación/edición/baja de centro, baja de producto. **Login y cambio de rol explícito todavía no** (ver T4.6 abajo); tampoco existe un flujo de baja de cuenta de usuario/especialista ni de suscripciones a nivel centro (no hay endpoint que lo implemente, fuera de alcance hasta que exista esa funcionalidad de negocio). |
| Inputs validados en el `service` | ✅ | `normalizeFilters`, `isIsoDate`, `normalizePositiveInt` en `audit.service.ts`; `actorName` se resuelve vía `.ilike()` parametrizado (Supabase client), no concatenación de SQL crudo. |
| No se commitean secrets / env vars documentadas | ✅ | Ningún cambio de esta iteración agrega variables de entorno. |
| RLS revisada en tablas nuevas | ❌ **Pendiente real** | `audit_logs` sigue sin `ENABLE ROW LEVEL SECURITY` (confirmado en `supabase/migrations/20260702000102_e3_m4_audit_logs_schema.sql`). El backend usa `service_role` siempre, así que el control de acceso efectivo es `requireRole('center_admin')`, no una política de base de datos — no resuelto porque implica escribir una migración nueva y eso requiere confirmación explícita antes de aplicarse. |
| Tokens no logueados en consola/analytics | ✅ | Ninguno de los call-sites de `recordAuditLog` (originales ni los agregados en las dos vueltas posteriores) loguea tokens. |

### Pendiente / fuera de alcance

- **RLS de `audit_logs`** (ver tabla arriba) — hallazgo de seguridad real, no resuelto, requiere migración nueva con confirmación explícita.
- **T4.6 incompleto**: login exitoso/fallido y cambio explícito de rol (`action: 'login'` / `'role_change'`) todavía no emiten `recordAuditLog`. Se cubrió creación/edición de `user_profile` y `specialist_profile`, que era el hallazgo reportado ("no aparecen usuarios creados ni editados"), pero no el resto de T4.6.
- **T4.8 (cifrado en tránsito / headers de seguridad)**: no hay `helmet` ni middleware equivalente configurado en `backend/src/app.ts` — solo `cors` y `express.json`. No se agregó en esta iteración por estar fuera del alcance pedido; queda como hallazgo para una futura vuelta de M4.
- **T4.7 (revisión de RBAC de M1/M2/M3/M5 completa)**: se verificaron puntualmente las rutas tocadas en esta sesión (`admin`, `profile`, `specialists` registro, `auth` registro — todas correctas), pero no se ejecutó una auditoría formal y documentada de **todas** las rutas nuevas de E3 como pide T4.7 textualmente.
- **Suscripciones de centro**: no existe el flujo de negocio (`subscriptions.service.ts#assignSubscription` rechaza explícitamente `ownerType !== 'user'`) — no se audita porque no hay nada que auditar todavía. Confirmado explícitamente con la usuaria que queda fuera de alcance hasta que se construya esa feature.
- **Baja (deactivate) de cuenta de usuario o especialista**: no existe ningún endpoint para dar de baja una cuenta (solo aprobar/rechazar especialista y soft-delete de centros/rutinas/productos). Mismo criterio que el punto anterior — fuera de alcance hasta que exista el flujo de negocio.
