# EOS Skincare App — Agent Instructions

## Project

React Native Expo frontend + Express/Node backend + Supabase.

## E2 module convention

New backend modules must follow:

```text
routes → controller → service → repository → tests
```

Tests must be written in Spanish, following the existing project style.

## Módulo 3 scope

Módulo 3 owns:

- `profiles.role` usage in middleware.
- `requireRole` middleware.
- Specialist registration.
- `specialist_profiles.license_status`.
- Specialist status endpoint.
- Frontend specialist registration flow.
- Specialist status screen.
- Role-based navigation.

Do not implement M1, M2, M4 or M5 unless explicitly requested.

## Expected branch

```text
feature/e2-roles-specialist-register
```

## Backend conventions

- Follow the existing Express module pattern.
- Keep controllers thin.
- Put business rules in services.
- Put Supabase queries in repositories when possible.
- Use existing `ApiError` pattern.
- Do not duplicate logic from other modules if a shared helper already exists.

## Frontend conventions

- Reuse existing app components, colors and route constants.
- Add new routes to `constants/routes.ts` when the project uses it.
- Keep specialist registration visually consistent with the current auth flow.
- Do not create a separate visual language for specialists unless explicitly requested.

## Verification

Before finishing a task, run the relevant backend tests and check TypeScript if available.

Recommended commands depend on the repo, but usually include one or more of:

```bash
npm test
npm run test
npm run typecheck
npm run lint
```

## Security

- Do not commit secrets.
- Do not make `specialist-docs` public.
- DNI and title photos must be stored in a private Supabase Storage bucket.
- Do not use real personal data in seeds or tests.
