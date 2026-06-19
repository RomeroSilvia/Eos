---
name: specialist-seed
description: Use this skill when creating local Supabase seed data for EOS specialists with role specialist and license_status pending, rejected, or verified for development/testing.
---

# specialist-seed

Use only for local development/testing data.

## Goal

Create SQL seed data for specialists so M3/M4/M5 can test flows without manual verification.

## Must create examples

- specialist pending
- specialist rejected with `rejection_reason`
- specialist verified

## Tables involved

- `profiles`
- `specialist_profiles`

## Rules

- Do not include real DNI, real license, or real personal data.
- Use fake emails and fake license numbers.
- Do not modify production data.
- Put SQL in a development seed file or documentation file, not inside the E2 migration unless explicitly requested.
- Make the seed idempotent if possible.

## Suggested fake data

Use clearly fake values such as:

```text
pending.specialist@example.test
rejected.specialist@example.test
verified.specialist@example.test
```

Use fake license numbers such as:

```text
MAT-PENDING-0001
MAT-REJECTED-0001
MAT-VERIFIED-0001
```

## Optional SQL structure

The final SQL must be adjusted to the current schema and auth strategy of the repo.

Prefer using fixed UUIDs for local seeds so tests can reference them consistently.
