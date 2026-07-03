# E3 Supabase Security

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

## Regla de uso backend

Los endpoints admin de M5 usan `authenticate` + `requireRole('center_admin')`.
No se expone escritura de planes/suscripciones desde cliente anonimo.

## Nota de alcance E3

`subscriptions.status` es informativo durante E3 y no bloquea acceso a funciones de otros modulos.
