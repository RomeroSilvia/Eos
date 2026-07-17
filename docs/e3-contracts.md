# E3 Contracts

## M1 - Rutinas Avanzadas

M1 consume el contrato de auditoria de M4 en modo best-effort para registrar cambios de pasos.

### Audit

Las operaciones backend de pasos emiten `recordAuditLog`:

- `POST /api/routines/:id/steps` -> `action: 'create'`
- `PATCH /api/routines/:id/steps/:stepId` -> `action: 'update'`
- `DELETE /api/routines/:id/steps/:stepId` -> `action: 'delete'`

Como el contrato M4 no define `routine_step` como entidad propia, M1 registra:

```ts
{
  entity: 'routine',
  entityId: routineId,
  metadata: {
    changeType: 'routine_step',
    stepId,
    stepName,
    category
  }
}
```

La auditoria no bloquea el flujo principal si falla.

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

Audit en M3 queda como TODO/best-effort hasta contrato final de M4.

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
  entity: 'routine' | 'specialist_profile' | 'center' | 'subscription' | 'product' | 'user_profile';
  entityId: string;
  before?: unknown; after?: unknown; metadata?: Record<string, unknown>;
}): Promise<void>;
```

Best-effort: nunca lanza excepcion, no bloquea el flujo del modulo que lo llama.

### Contrato de lectura (nuevo)

```text
GET /api/admin/audit-log?entity=&entityId=&actorId=&from=&to=&page=&limit=
```

Requiere usuario autenticado con rol `center_admin` (no existe rol `admin`/`platform_admin` en el sistema; se reutiliza el mismo gate que `/api/admin/*` y `/api/centers`).

Query params (todos opcionales):

- `entity`: uno de los valores de `AuditEntity`.
- `entityId`: filtra por entidad exacta.
- `actorId`: filtra por usuario que ejecuto la accion.
- `from` / `to`: rango de fechas en formato `YYYY-MM-DD`, inclusive, sobre `created_at`. `from` no puede ser posterior a `to`.
- `page`: entero positivo, sin tope (default `1`).
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
    routineStepDetail: {             // solo si metadata es de un paso de rutina (M1), si no null
      category: string | null;
      stepName: string | null;
      hasProducts: boolean;
    } | null;
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
- El detalle expandible de cada evento se arma distinto segun `action`:
  - `delete`: un solo recuadro con "Elemento eliminado" (actor y fecha ya se muestran arriba, en el meta grid Actor/Perfil/Registro/Fecha de la tarjeta).
  - `create`: un recuadro con los campos de `after` (`FieldValue`, recursivo con bullets para objetos anidados).
  - cualquier otra accion con `before`/`after`: dos recuadros, "Antes" y "Despues", solo con los campos que cambiaron.
  - `routineStepDetail` (categoria, nombre de paso, si tiene productos) se muestra en un recuadro aparte, unicamente cuando `action === 'create'` (se agrega un paso).

### Pendiente / fuera de alcance de esta iteracion

- RLS de `audit_logs`: la migracion original (`20260702000102_e3_m4_audit_logs_schema.sql`) no habilita RLS. El backend siempre usa el cliente `service_role` (`backend/src/config/supabase.ts`), por lo que el control de acceso real hoy es el middleware `requireRole('center_admin')`, no una politica de base de datos. Falta la migracion de RLS que documenta la seccion 12 del plan de Entrega 3 (`docs/plan_entrega3.md`) — reportado como hallazgo pendiente, no resuelto en esta entrega para no tocar una migracion sin confirmacion explicita.
- T4.6 (auditoria de eventos de `auth.service.ts`: login exitoso/fallido, cambio de rol) sigue pendiente y es responsabilidad coordinada con M2.
- T4.7/T4.8/T4.9 (revision de RBAC, cifrado en transito, exposicion de errores) no se ejecutaron como parte de este cambio.
