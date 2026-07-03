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
