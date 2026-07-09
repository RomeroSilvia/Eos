---
name: e3-routine-wizard-perf
description: Use this skill for EOS Entrega 3 Modulo 1: routine wizard performance, optimistic navigation, routine step editing, audit integration, tests, accessibility, and module documentation.
---

# e3-routine-wizard-perf

Use this skill only for E3-M1: Rutinas Avanzadas & Performance.

## Scope

M1 owns:

1. Routine wizard screens in `app/routine/`.
2. Routine state and daily check hooks.
3. Routine frontend service contract.
4. Routine backend module.
5. Routine step editing for existing routines.
6. Wizard performance profiling and automated guard.
7. Accessibility for the routine wizard.

Do not implement:

- M2 federated auth/session changes.
- M3 centers/admin dashboard internals.
- M4 audit module internals or audit panel.
- M5 plans, subscriptions or advanced reports.

## Owned Files

Primary M1 files:

```text
app/(tabs)/routine.tsx
app/routine/
components/RoutineStepCard.tsx
components/RoutineProgressCard.tsx
components/RoutineSectionCard.tsx
components/RoutineStepItem.tsx
components/ProductSelector.tsx
hooks/useRoutine.ts
hooks/useRoutineWizard.tsx
hooks/useRoutineWizardProfiler.ts
services/routines.ts
types/routine.ts
backend/src/modules/routines/
scripts/routine-wizard-performance.js
docs/routine-wizard-performance.md
```

Shared files may be touched only when the M1 change requires it and the reason is documented.

## Wizard Performance Contract

RNF-01 target:

```text
perceived step transition p95 <= 100ms
```

The app measures transitions in development through:

```text
hooks/useRoutineWizardProfiler.ts
markRoutineWizardTransition(from, to)
logRoutineWizardWork(label, startedAt)
```

Logs use:

```text
[routine-wizard:first-frame]
[routine-wizard:interactions-complete]
[routine-wizard:work]
```

The automated regression guard is:

```bash
npm run perf:routine-wizard
```

This script verifies that optimistic transitions schedule navigation before waiting for backend persistence.

## State And Navigation

Wizard state lives in `useRoutineWizard`.

Keep Step2 and Step3 optimistic:

1. Validate local input.
2. Update reducer state.
3. Start create/update persistence in background.
4. Navigate immediately.
5. Surface persistence errors without blocking the first frame.

Do not reintroduce blocking network calls before `router.push` on wizard transitions covered by RNF-01.

## Routine Step Editing

Frontend editing flow:

- `routine-edit.tsx` lists routine steps and opens `Add-step` for create/edit.
- `Add-step.tsx` supports both new and existing steps through `stepId`.
- Deleting a step requires confirmation.

Backend endpoints:

```text
POST   /api/routines/:id/steps
PATCH  /api/routines/:id/steps/:stepId
DELETE /api/routines/:id/steps/:stepId
```

Also keep the legacy flat service calls compatible only when existing code still needs them.

## Permissions

The service must preserve the E2 rule:

```text
Clients cannot edit the structure of routines assigned by a specialist.
```

Validate routine ownership and step membership in the backend service. Never trust only the frontend route params.

## Audit

M1 consumes M4 audit as best-effort. Step mutations call:

```ts
recordAuditLog(...)
```

Use:

```text
entity: 'routine'
entityId: routineId
metadata.changeType: 'routine_step'
```

Audit failure must not block the routine mutation.

## Accessibility

When editing wizard UI, keep:

- Interactive elements with `accessibilityLabel`.
- Buttons with `accessibilityRole="button"`.
- Goal/type choices with `accessibilityRole="radio"` and selected state.
- Step completion toggles with checkbox semantics.
- Accordions with expanded state.
- Disabled controls with disabled state.
- Decorative icons marked outside the accessible tree.

Do not add placeholder buttons as enabled controls unless they perform a real action.

## Tests And Verification

Relevant commands:

```bash
cd backend && npm test -- routines
cd backend && npm run typecheck
npm run perf:routine-wizard
npx tsc --noEmit
```

Known caveat:

The repo currently has TypeScript errors outside M1 in admin screens. If `npx tsc --noEmit` fails, confirm whether errors are limited to unrelated files and document that in the final handoff.

## Docs Required

When M1 behavior changes, update the same PR/commit with the relevant docs:

- `docs/routine-wizard-performance.md`
- `docs/division-modulos.md`
- `docs/e3-contracts.md` if audit/backend contracts change.
- `CHANGELOG.md` when closing the module.
