---
name: e3-subscriptions-reports
description: Use this skill for EOS Entrega 3 M5: subscription plans, subscriptions assignment, admin reports by center, and module tests/documentation.
---

# e3-subscriptions-reports

Use this skill only for Entrega 3 Módulo 5.

## Scope

Implement only:

1. Subscription plans schema + backend CRUD.
2. Subscriptions assignment for user/center.
3. Admin reports endpoint by center with date filters.
4. Frontend admin screens for plans and reports.
5. M5 tests and docs.

Do not implement:

- M1 routine wizard performance/refactor.
- M2 federated auth/realtime notifications.
- M3 center CRUD and center admin model internals.
- M4 audit panel and security sweeps.

## Backend structure

Follow vertical module convention:

- backend/src/modules/subscriptions/
- backend/src/modules/reports/

Pattern:

routes -> controller -> service -> repository -> tests

## Endpoints

Implement and keep stable:

- GET /api/admin/subscriptions/plans
- POST /api/admin/subscriptions/plans
- PATCH /api/admin/subscriptions/plans/:planId
- GET /api/admin/subscriptions
- POST /api/admin/subscriptions
- GET /api/admin/reports?centerId=&from=&to=

All endpoints require:

- authenticate
- requireRole('center_admin')

## Business rule contract

`subscriptions.status` is informative in E3 and must not block other modules.

## SQL contract

Migration files:

- supabase/migrations/20260701000500_e3_m5_subscriptions_schema.sql
- supabase/migrations/20260701000501_e3_m5_metrics_views.sql

Seed file:

- database/e3_m5_subscription_plans_seed.sql

## Docs required

Update in same PR:

- docs/e3-contracts.md (M5 contract)
- docs/e3-supabase-security.md (RLS details M5)
- CHANGELOG.md (Entrega 3 M5 entry)
- README.md (new backend/frontend module references)

## Verification

Run:

- cd backend && npm test
- cd backend && npm run typecheck
