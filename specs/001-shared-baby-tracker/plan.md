# Implementation Plan: Shared Baby Tracker

**Branch**: `001-shared-baby-tracker` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-shared-baby-tracker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A self-hosted baby-care tracker where any number of caregivers linked to a baby profile (e.g., a husband and wife) log feedings, diaper changes, sleep sessions, and pumping, and instantly see each other's entries — plus growth, milestones, and due-based reminders. Delivered as a single installable Progressive Web App (web is the primary surface; the same app installs to iOS/Android home screens) talking to a self-hosted Node.js/SQLite backend over a REST API and a real-time WebSocket sync channel, with offline-first local storage so logging never blocks on connectivity.

## Technical Context

**Language/Version**: TypeScript — Node.js 20+ (backend), ES2022+ targeting evergreen browsers (frontend)
**Primary Dependencies**: Fastify, Drizzle ORM, `ws` (backend); React, Vite, `vite-plugin-pwa`, Dexie.js (frontend)
**Storage**: SQLite, single file on a Docker-persisted volume
**Testing**: Vitest (backend + frontend unit/integration), Playwright (multi-caregiver E2E sync scenarios)
**Target Platform**: Installable PWA — any modern desktop/mobile browser, plus iOS/Android home-screen install — backed by a self-hosted Linux server (Docker)
**Project Type**: Web application (backend API + frontend PWA)
**Performance Goals**: An event logged by one caregiver visible to another within 5s under normal network conditions (SC-002); a routine log entry completed in under 10s (SC-001)
**Constraints**: Must remain fully usable offline and sync without creating duplicates on reconnect (FR-012, FR-018); must not depend on a third-party vendor's cloud for data storage (FR-015); must remain reachable away from the home network (FR-019)
**Scale/Scope**: Single household per deployed instance (Clarifications session 2026-09-21); a handful of caregivers and baby profiles; multi-year event history at family scale

All items above were resolved during Phase 0 — see `research.md` for the decision, rationale, and alternatives considered behind each one.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` has not been ratified for this project — it still contains only the unfilled template placeholders (no principles have been defined). There are therefore no constitution-derived gates to evaluate against this plan, and nothing here is blocked on that basis.

**Recommendation** (non-blocking): run `/speckit-constitution` before or during implementation to establish binding engineering principles (e.g., around testing discipline, offline-sync correctness, or self-hosting simplicity) for this project, since several of the decisions in `research.md` (e.g., rejecting a CRDT library and vendor BaaS in favor of a simpler self-hosted approach) are exactly the kind of judgment calls a constitution is meant to make consistent across future features.

*Post-design re-check*: No new gates were introduced by Phase 1 design (data-model.md, contracts/api.md); still N/A for the same reason as above.

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-baby-tracker/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md            # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── db/            # SQLite schema & Drizzle migrations (Household, Caregiver, CaregiverDevice,
│   │                   #   BabyProfile, CaregiverBabyAccess, InviteCode, CareEvent, GrowthMeasurement,
│   │                   #   Milestone, Reminder — see data-model.md)
│   ├── api/            # REST route handlers (invites, babies, events, growth, milestones, reminders)
│   ├── sync/            # WebSocket push + offline-queue reconciliation (see contracts/api.md)
│   └── auth/            # Invite issuance/redemption, device-token verification (no passwords)
└── tests/
    ├── contract/         # Request/response shape tests against contracts/api.md
    ├── integration/       # Offline-queue replay, concurrent-create preservation (FR-012, FR-018)
    └── unit/

frontend/
├── src/
│   ├── components/
│   ├── pages/           # Timeline/status, Log Event, Growth, Milestones, Reminders, Invite/Join
│   ├── data/             # Dexie (IndexedDB) local store + sync client + offline write queue
│   └── service-worker/  # PWA offline caching, install prompt
└── tests/
    ├── unit/
    └── e2e/              # Playwright multi-caregiver sync scenarios (see quickstart.md)

deploy/
└── docker-compose.yml   # Single self-host bundle: backend + built frontend + SQLite volume
```

**Structure Decision**: Standard web-application layout (`backend/` + `frontend/`), plus a `deploy/` directory for the self-hosting bundle. iOS/Android support is delivered through the installable PWA in `frontend/` rather than separate native trees (see `research.md` §1 "Cross-platform delivery") — the template's Option 3 (separate `ios/`/`android/` directories) is not needed.

## Complexity Tracking

*No constitution gates were violated (see Constitution Check above — none currently exist to violate), so this section is not applicable.*
