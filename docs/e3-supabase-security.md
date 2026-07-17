# E3 Supabase Security

## M3 - Centers

M3 introduce acceso por scope de centros.

### Tables

```text
centers
center_admins
specialist_profiles.center_id
```

### RLS Intent

`centers` y `center_admins` tienen RLS habilitado.

Read access:

- `center_admin` puede leer centros asociados por `center_admins`.
- `center_admin` puede leer solo sus filas propias en `center_admins`.

Write access:

- Backend fuerza `authenticate` y `requireRole('center_admin')`.
- Services backend validan acceso por `center_admins` antes de mutaciones.
- Politicas SQL de escritura directa desde cliente no se abren.

### Specialist Assignment

`PATCH /api/admin/specialists/:specialistId/center` actualiza `specialist_profiles.center_id`.

Reglas:

- `centerId` puede ser id de centro o `null`.
- Si no es null, el centro debe existir, estar activo y ser accesible para el admin.
- `null` desasocia especialista del centro.

### Dashboard

`GET /api/centers/:centerId/dashboard` queda scoped por `center_admins`.

Retorna solo contadores basicos:

```text
specialistsTotal
specialistsVerified
specialistsPending
clientsTotal
```

Reportes avanzados y exportes corresponden a M5.

### Audit

M3 deja audit como TODO/best-effort hasta M4.

## Estado por tabla (M5)

| Tabla | Modulo | RLS | Detalle |
|---|---|---|---|
| `subscription_plans` | M5 | Activo | Lectura autenticada. Escritura por `center_admin` via backend. |
| `subscriptions` | M5 | Activo | Lectura propia (`owner_type='user'`) o por `center_admin`. Escritura por `center_admin` via backend. |

## SQL implementado (M5)

- Migracion: `supabase/migrations/20260701000500_e3_m5_subscriptions_schema.sql`
  - `alter table public.subscription_plans enable row level security;`
  - `alter table public.subscriptions enable row level security;`
  - Politicas de lectura/escritura explicitas para ambos recursos.

- Migracion de metricas: `supabase/migrations/20260701000501_e3_m5_metrics_views.sql`
  - Crea vista `public.vw_e3_global_summary`.
  - Agrega indices para consultas de reportes.

## Regla de uso backend (M5)

Los endpoints admin de M5 usan `authenticate` + `requireRole('center_admin')`.
No se expone escritura de planes/suscripciones desde cliente anonimo.

## Nota de alcance E3 (M5)

`subscriptions.status` es informativo durante E3 y no bloquea acceso a funciones de otros modulos.

## Estado por tabla (M4)

| Tabla | Modulo | RLS | Detalle |
|---|---|---|---|
| `audit_logs` | M4 | **No habilitado** | Ver seccion siguiente. |

### `audit_logs` - estado real

Migracion: `supabase/migrations/20260702000102_e3_m4_audit_logs_schema.sql`.

- La tabla **no tiene `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`** en la migracion original. Esto contradice la regla general de la seccion 12 del plan de Entrega 3 (`docs/plan_entrega3.md`), que exige RLS activo desde la misma migracion para toda tabla nueva.
- El control de acceso real hoy no depende de RLS: `backend/src/config/supabase.ts` crea el cliente `supabase` con la `service_role key`, que **bypassea RLS por diseno**, y tanto la escritura (`recordAuditLog`) como la lectura (`GET /api/admin/audit-log`) pasan siempre por ese cliente desde el backend. Ningun endpoint expone `audit_logs` a un cliente con `anon key`.
- El gate de acceso efectivo es el middleware `authenticate` + `requireRole('center_admin')` en `backend/src/modules/audit/audit.routes.ts`, igual que el resto de `/api/admin/*`.
- **Pendiente:** agregar una migracion nueva (`supabase/migrations/<timestamp>_e3_m4_audit_logs_rls.sql`) que habilite RLS con politica deny-all por defecto y, como minimo, escritura solo por `service_role` y lectura solo por roles `specialist`/`center_admin` sobre su propio scope (segun lo que ya anticipaba la fila de `audit_logs` en la seccion 12 del plan). No se aplico en esta iteracion porque implica tocar una migracion de base de datos y corresponde confirmarlo explicitamente antes de crearla (ver `docs/e3-contracts.md`, seccion M4, "Pendiente / fuera de alcance").

## Regla de uso backend (M4)

`GET /api/admin/audit-log` usa `authenticate` + `requireRole('center_admin')`. No existe un endpoint que exponga `audit_logs` sin autenticacion ni con `anon key`.

El enriquecimiento de la respuesta (nombre de actor, nombre de la entidad afectada, nombre del titular de una suscripcion) hace lookups adicionales contra `profiles`, `centers`, `routines`, `products`, `specialist_profiles`, `subscriptions` y `subscription_plans` — todos con el mismo cliente `service_role`, mismo gate de `requireRole('center_admin')`. No se agrega ninguna tabla nueva ni cambia el estado de RLS descripto arriba.
