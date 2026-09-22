# Implementation Plan: Feed, Pumping & Diaper Event Details

**Branch**: `002-care-event-details` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-care-event-details/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Adds structured detail to three existing Care Event types: `feed` gains a required breastfeed/formula method plus an optional formula amount (ounces); `pumping` gains an optional amount (ounces); `diaper` gains a required pee/poop/both classification and reuses the existing free-form `notes` field for a description. Implemented as three new nullable columns on the existing `care_events` table, riding the existing sync/offline-queue machinery unchanged, with the Log Event UI updated so classification stays a single required tap and amount/notes stay optional.

## Technical Context

**Language/Version**: TypeScript — unchanged from `specs/001-shared-baby-tracker/plan.md` (Node.js 20+ backend, ES2022+ frontend)
**Primary Dependencies**: No new dependencies — extends the existing Fastify/Drizzle/SQLite backend and React/Vite/Dexie frontend
**Storage**: SQLite — three new nullable columns (`feed_type`, `amount_oz`, `diaper_contents`) on the existing `care_events` table, via a new Drizzle migration
**Testing**: Unchanged (Vitest/Playwright tooling already installed; still no dedicated test-writing tasks unless requested)
**Target Platform**: Unchanged — same installable PWA + self-hosted server
**Project Type**: Web application (backend + frontend) — unchanged
**Performance Goals**: Logging a classified event stays within the existing "under ~10-15s, one extra tap" bar (FR-013, SC-001 through SC-004)
**Constraints**: Must not add a required step to breastfeed or diaper logging beyond the one classification tap (FR-013); must not touch the sync protocol (research.md §2)
**Scale/Scope**: Same single-household scale as the base feature; this is a schema/UI extension, not a new subsystem

All items above were resolved during Phase 0 — see `research.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still unratified (template placeholders only, unchanged since `specs/001-shared-baby-tracker/plan.md`). No constitution-derived gates apply. Same non-blocking recommendation as before: consider running `/speckit-constitution` at some point.

*Post-design re-check*: No new gates introduced by Phase 1 design (data-model.md, contracts/api.md) — still N/A for the same reason.

## Project Structure

### Documentation (this feature)

```text
specs/002-care-event-details/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md             # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

No new directories — this feature only touches existing files from `specs/001-shared-baby-tracker/`:

```text
backend/
├── src/db/schema.ts              # + feedType, amountOz, diaperContents columns on careEvents
├── src/db/migrations/            # + one new generated migration
└── src/api/events.ts             # POST/PATCH body + validation for the new fields

frontend/
├── src/data/db.ts                # Dexie CareEvent interface: + the 3 new fields
├── src/data/careEvents.ts        # createLocalEvent/updateLocalEvent: pass the new fields through
├── src/data/syncClient.ts        # applyCareEventRecord: map the new fields from server records
├── src/pages/LogEvent.tsx        # Feed → Breastfeed/Formula; Diaper → Pee/Poop/Both; optional-amount inline UI
└── src/components/EventList.tsx  # render feed type/amount, diaper classification/note
```

**Structure Decision**: No structural change to `specs/001-shared-baby-tracker/plan.md`'s web-application layout — this feature is purely additive within the existing `backend/` and `frontend/` trees.

## Complexity Tracking

*No constitution gates were violated (none currently exist), so this section is not applicable.*
