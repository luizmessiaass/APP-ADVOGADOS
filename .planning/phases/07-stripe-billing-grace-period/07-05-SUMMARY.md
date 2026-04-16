# Plan 07-05 Summary: BullMQ Grace Period Cron + Resend Emails

**Status:** Complete
**Commits:** 88a4c8b, 33694a7

## What Was Built

Implemented the BullMQ daily cron job (`0 12 * * *` UTC = 09:00 BRT) that drives the grace period state machine. The worker calculates days since `grace_period_started_at` and advances tenants through stages: Day 0 → email + status=grace, Day 3 → grace_banner flag, Day 7 → status=read_only + email, Day 14 → status=suspended + email. Uses Resend SDK for transactional emails. Each state transition is recorded in `billing_events` for idempotency.

## Key Files

### Created
- `apps/worker/src/queues/grace-period.ts` — BullMQ queue definition for grace period processing
- `apps/worker/src/workers/grace-period-check.ts` — Daily cron processor: state machine logic (Day 0/3/7/14 transitions), Resend email dispatch, billing_events idempotency, Redis cache invalidation via `invalidateTenantStatusCache`

### Modified
- `apps/worker/src/worker.ts` — Registered grace-period-check Worker with `JobScheduler` cron `0 12 * * *`
- `apps/worker/package.json` — Added `resend@6.12.0` dependency

## Self-Check: PASSED

- BullMQ cron `0 12 * * *` UTC registered ✓
- Day 0/3/7/14 transitions implemented ✓
- Resend emails sent at Day 0, Day 7, Day 14 ✓
- `billing_events` stage markers for idempotency ✓
- Redis cache invalidated on every status change ✓
- `env.RESEND_API_KEY` wired into Resend client ✓
- BILLING-06 requirements addressed ✓
