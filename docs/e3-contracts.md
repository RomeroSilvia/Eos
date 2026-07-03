# E3 Contracts

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
