# E3 Contracts

## M3 - Centros Esteticos & Tablero Admin

M3 publishes the center contract used by admin screens and later reporting modules.

### Database

Owned by M3:

```text
centers
center_admins
specialist_profiles.center_id
```

Contract:

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

All endpoints require an authenticated user with role `center_admin`.

Center scope is defined by `center_admins`; a center admin can operate only on centers linked to their user id.

### Dashboard

M3 exposes only basic counters:

```ts
{
  specialistsTotal: number;
  specialistsVerified: number;
  specialistsPending: number;
  clientsTotal: number;
}
```

This is not the M5 reporting module. No date filters, exports, plans or advanced metrics are part of this contract.

### Audit

Audit calls are TODO/best-effort until M4 provides the final `recordAuditLog` contract.
