# E3 Supabase Security

## M3 - Centers

M3 introduces center-scoped data access.

### Tables

```text
centers
center_admins
specialist_profiles.center_id
```

### RLS Intent

`centers` and `center_admins` have RLS enabled.

Read access:

- `center_admin` can read centers associated through `center_admins`.
- `center_admin` can read only their own `center_admins` rows.

Write access:

- Backend endpoints enforce `authenticate` and `requireRole('center_admin')`.
- Backend services validate center access through `center_admins` before mutations.
- SQL write policies for direct client writes are intentionally not opened.

### Specialist Assignment

`PATCH /api/admin/specialists/:specialistId/center` updates `specialist_profiles.center_id`.

Rules:

- `centerId` can be a center id or `null`.
- Non-null `centerId` must exist, be active, and be accessible by the admin.
- `null` desassociates the specialist from a center.

### Dashboard

`GET /api/centers/:centerId/dashboard` is scoped by `center_admins`.

It returns basic counters only:

```text
specialistsTotal
specialistsVerified
specialistsPending
clientsTotal
```

Advanced reports and exports are M5.

### Audit

M3 leaves audit as TODO/best-effort until M4 exists.
