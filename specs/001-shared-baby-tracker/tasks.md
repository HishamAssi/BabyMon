---

description: "Task list template for feature implementation"
---

# Tasks: Shared Baby Tracker

**Input**: Design documents from `/specs/001-shared-baby-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not explicitly requested in the feature spec, so no dedicated test-writing tasks are included below. `research.md` §7 documents the intended testing strategy (Vitest + Playwright) for when tests are added later; Phase 1 installs the tooling only.

**Organization**: Tasks are grouped by user story (from spec.md, in priority order) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web application layout per `plan.md`: `backend/src/`, `backend/tests/`, `frontend/src/`, `frontend/tests/`, `deploy/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per plan.md: `backend/src/{db,api,sync,auth}`, `backend/tests/{contract,integration,unit}`, `frontend/src/{components,pages,data,service-worker}`, `frontend/tests/{unit,e2e}`, `deploy/`
- [X] T002 Initialize backend Node.js/TypeScript project with Fastify, Drizzle ORM, and `ws` dependencies in `backend/package.json`
- [X] T003 [P] Initialize frontend Vite/React/TypeScript project with `vite-plugin-pwa` and Dexie.js dependencies in `frontend/package.json`
- [X] T004 [P] Configure linting, formatting, and test-runner tooling (ESLint, Prettier, Vitest, Playwright) for `backend/` and `frontend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Define base SQLite schema (Household, Caregiver, CaregiverDevice, BabyProfile, CaregiverBabyAccess) via Drizzle in `backend/src/db/schema.ts`
- [X] T006 Setup Drizzle migrations framework and initial migration in `backend/src/db/migrations/`
- [X] T007 Implement device-token auth middleware (resolves Authorization header → Caregiver + CaregiverBabyAccess) in `backend/src/auth/device-auth.ts` (depends on T005)
- [X] T008 [P] Setup Fastify app bootstrap, routing structure, and error-handling middleware in `backend/src/api/server.ts`
- [X] T009 [P] Setup environment/config loader (DB path, port) in `backend/src/config.ts`
- [X] T010 Implement first-run setup-mode bootstrap (creates Household + first BabyProfile + first invite when no Caregiver exists) in `backend/src/api/setup.ts` (depends on T005, T008)
- [X] T011 [P] Scaffold frontend app shell, routing, and PWA manifest/service worker registration in `frontend/src/main.tsx` and `frontend/src/service-worker/`
- [X] T012 [P] Setup Dexie (IndexedDB) local schema mirroring backend entities in `frontend/src/data/db.ts`
- [X] T013 Implement device-token storage and authenticated API client in `frontend/src/data/apiClient.ts` (depends on T011)
- [X] T014 [P] Write `deploy/docker-compose.yml` bundling backend + built frontend static assets + SQLite volume

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Log a care event and have it appear for the other caregiver (Priority: P1) 🎯 MVP

**Goal**: A caregiver logs a feed/diaper/sleep/pumping event in a few taps, and it appears for every other caregiver linked to the same baby without any manual refresh.

**Independent Test**: Two caregiver sessions on two devices, both already linked to the same baby profile; log an event on one, confirm it appears on the other.

### Implementation for User Story 1

- [X] T015 [P] [US1] Add CareEvent table schema in `backend/src/db/schema.ts` (depends on T005)
- [X] T016 [US1] Implement `POST /babies/:babyId/events`, idempotent by client-generated UUID, in `backend/src/api/events.ts` (depends on T015, T007)
- [X] T017 [US1] Implement `PATCH /babies/:babyId/events/:eventId` (edits, incl. closing an in-progress sleep session) in `backend/src/api/events.ts` (depends on T016)
- [X] T018 [US1] Implement `GET /babies/:babyId/events?since=<cursor>` in `backend/src/api/events.ts` (depends on T015)
- [X] T019 [US1] Implement WebSocket `/sync` channel pushing create/update/delete events to every connected device for the household in `backend/src/sync/socket.ts` (depends on T007, T016)
- [X] T020 [P] [US1] Create CareEvent local store and offline write-queue in `frontend/src/data/careEvents.ts` (depends on T012)
- [X] T021 [US1] Implement sync client (WebSocket connect, cursor tracking, offline-queue replay on reconnect, polling fallback) in `frontend/src/data/syncClient.ts` (depends on T013, T019, T020)
- [X] T022 [P] [US1] Build "Log Event" quick-entry UI for feed/diaper/sleep/pumping in `frontend/src/pages/LogEvent.tsx` (depends on T020)
- [X] T023 [US1] Build in-progress sleep session indicator, visible to all linked caregivers, in `frontend/src/components/SleepStatus.tsx` (depends on T021)
- [X] T024 [US1] Wire caregiver attribution ("who logged this") into event rendering in `frontend/src/components/EventList.tsx` (depends on T021)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Invite and manage co-caregivers on a baby's profile (Priority: P1)

**Goal**: A caregiver creates a baby profile and invites another person (e.g., their spouse) to join it via a lightweight invite link/code, and can later revoke that access.

**Independent Test**: One caregiver creates a baby profile and an invite; a second person redeems it and immediately sees the existing log.

### Implementation for User Story 2

- [X] T025 [P] [US2] Add CaregiverBabyAccess and InviteCode table schema in `backend/src/db/schema.ts` (depends on T005)
- [X] T026 [US2] Implement `POST /invites/:babyId` (modes `new_caregiver` / `add_device`) in `backend/src/api/invites.ts` (depends on T025, T007)
- [X] T027 [US2] Implement `POST /invites/:code/redeem` (creates Caregiver+CaregiverDevice+CaregiverBabyAccess, or links a device to an existing caregiver identity) in `backend/src/api/invites.ts` (depends on T026)
- [X] T028 [US2] Implement `DELETE /babies/:babyId/caregivers/:caregiverId` (revoke access, preserve historical attribution) in `backend/src/api/invites.ts` (depends on T025, T007)
- [X] T029 [P] [US2] Build "Invite Caregiver" UI (generate link/QR code, copy) in `frontend/src/pages/InviteCaregiver.tsx` (depends on T013)
- [X] T030 [P] [US2] Build "Join via Invite" redemption flow (display-name entry for a new caregiver) in `frontend/src/pages/JoinInvite.tsx` (depends on T013)
- [X] T031 [US2] Build caregiver management UI (list active caregivers, revoke access) in `frontend/src/pages/ManageCaregivers.tsx` (depends on T028)
- [X] T032 [US2] On successful join, fetch and render the baby's full existing history rather than an empty state, in `frontend/src/pages/JoinInvite.tsx` (depends on T018, T030)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - See a combined timeline and at-a-glance status (Priority: P2)

**Goal**: Any caregiver can see, without scrolling, the time elapsed since the last feed/diaper/sleep, plus one merged chronological timeline of everything logged by every caregiver.

**Independent Test**: Log several events from two different caregiver accounts; confirm a third view shows them merged in correct order with accurate "time since" indicators.

### Implementation for User Story 3

- [X] T033 [P] [US3] Implement "time elapsed since last event per type" computed view in `frontend/src/data/statusSummary.ts` (depends on T020)
- [X] T034 [US3] Build baby status summary UI (time since last feed/diaper/sleep) in `frontend/src/pages/BabyStatus.tsx` (depends on T033)
- [X] T035 [US3] Build merged chronological timeline UI across all caregivers in `frontend/src/pages/Timeline.tsx` (depends on T021, T024)

**Checkpoint**: All user stories should now be independently functional (US1-US3)

---

## Phase 6: User Story 4 - Track growth measurements and milestones (Priority: P3)

**Goal**: A caregiver records weight/length/head-circumference measurements and developmental milestones (with an optional photo), viewable by every linked caregiver over time.

**Independent Test**: Add a growth measurement and a milestone from one caregiver's device; confirm both appear, correctly dated, on another caregiver's device.

### Implementation for User Story 4

- [X] T036 [P] [US4] Add GrowthMeasurement and Milestone table schema in `backend/src/db/schema.ts` (depends on T005)
- [X] T037 [US4] Implement `GET/POST /babies/:babyId/growth` in `backend/src/api/growth.ts` (depends on T036, T007)
- [X] T038 [US4] Implement `GET/POST /babies/:babyId/milestones` plus `POST .../milestones/:id/photo` (stored locally, not on an external service) in `backend/src/api/milestones.ts` (depends on T036, T007)
- [X] T039 [P] [US4] Build growth history UI in `frontend/src/pages/Growth.tsx` (depends on T013)
- [X] T040 [P] [US4] Build milestones UI (list + add, with optional photo) in `frontend/src/pages/Milestones.tsx` (depends on T013)

**Checkpoint**: US1-US4 independently functional

---

## Phase 7: User Story 5 - Get reminded when the next feeding or medicine dose is due (Priority: P3)

**Goal**: A caregiver sets a recurring interval for an activity (e.g., feeding, medicine); the app notifies caregivers when that interval has elapsed since the most recent matching logged event.

**Independent Test**: Log a feed, set a reminder interval, and confirm a reminder fires at the expected time relative to that entry; confirm it recalculates after a newer matching entry is logged.

### Implementation for User Story 5

- [X] T041 [P] [US5] Add Reminder table schema in `backend/src/db/schema.ts` (depends on T005)
- [X] T042 [US5] Implement `GET/POST/PATCH /babies/:babyId/reminders` in `backend/src/api/reminders.ts` (depends on T041, T007)
- [X] T043 [US5] Implement due-time computation from the latest matching, non-deleted CareEvent in `backend/src/sync/reminders.ts` (depends on T015, T041)
- [X] T044 [P] [US5] Build reminder settings UI (interval per event type) in `frontend/src/pages/Reminders.tsx` (depends on T013)
- [X] T045 [US5] Implement due-reminder notification delivery (Web Push / in-app banner, per device with notifications enabled) in `frontend/src/data/notifications.ts` (depends on T043)

**Checkpoint**: All five user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T046 [P] Add structured request logging across backend handlers in `backend/src/api/`
- [X] T047 [P] Add rate-limiting to invite redemption in `backend/src/api/invites.ts`
- [X] T048 [P] Write `deploy/README.md` documenting self-hosting and remote-access setup (from quickstart.md)
- [ ] T049 Run `quickstart.md` validation end-to-end across three devices
- [X] T050 [P] Accessibility pass (keyboard nav, contrast, screen-reader labels) on Log Event, Timeline, and Invite flows
- [ ] T051 Hash CaregiverDevice tokens at rest and enforce invite-code expiry in `backend/src/auth/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1; US2 (invites) is the enabling setup step for US1 (syncing between caregivers) to have anyone to sync with, but each is independently testable per its own Independent Test
  - US3, US4, US5 can proceed in parallel with each other once Foundational is done (each depends only on Foundational + relevant US1 pieces, not on each other)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - independently testable on its own once at least one caregiver exists (Foundational's first-run bootstrap covers this)
- **User Story 2 (P1)**: Can start after Foundational - no code dependency on US1, though it's what makes US1 valuable with more than one caregiver
- **User Story 3 (P2)**: Can start after Foundational; reuses US1's local event store (T020) and event rendering (T024) but adds no new backend endpoints
- **User Story 4 (P3)**: Can start after Foundational - fully independent data (growth/milestones), no dependency on US1-3
- **User Story 5 (P3)**: Can start after Foundational; reads CareEvent data written by US1 (T015) but adds its own schema/endpoints

### Within Each User Story

- Schema before endpoints
- Endpoints before sync/UI that consume them
- Core implementation before integration polish
- Story complete before moving to next priority (if working sequentially)

### Parallel Opportunities

- T003, T004 (Setup) can run in parallel with each other and with T002
- T008, T009, T011, T012, T014 (Foundational) can run in parallel once T005-T007/T013 dependencies are met per the notes above
- Once Foundational completes, US1, US2, US4 can start in parallel (different files); US3 and US5 need pieces of US1 first
- Within a story, tasks marked [P] (different files, no blocking dependency) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Backend schema and frontend local store can be built in parallel:
Task: "Add CareEvent table schema in backend/src/db/schema.ts"
Task: "Create CareEvent local store and offline write-queue in frontend/src/data/careEvents.ts"

# Once the API exists, quick-entry UI and attribution rendering can proceed in parallel:
Task: "Build Log Event quick-entry UI in frontend/src/pages/LogEvent.tsx"
Task: "Wire caregiver attribution into event rendering in frontend/src/components/EventList.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (core logging + sync)
4. Complete Phase 4: User Story 2 (inviting a second caregiver) — without this, US1 has no one to sync with in practice
5. **STOP and VALIDATE**: Run the quickstart.md primary-flow walkthrough with two real devices
6. Deploy/demo if ready — this is the minimum that delivers the feature's core ask ("husband and wife can both update the same application")

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Test independently → Deploy/Demo (MVP!)
3. Add US3 (status/timeline) → Test independently → Deploy/Demo
4. Add US4 (growth/milestones) → Test independently → Deploy/Demo
5. Add US5 (reminders) → Test independently → Deploy/Demo
6. Polish phase → Final hardening pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No dedicated test-writing tasks are included (not explicitly requested in spec.md); T004 only installs the Vitest/Playwright tooling referenced in research.md §7 for when tests are added
- Avoid: vague tasks, same-file conflicts across parallel tasks, cross-story dependencies that break independent testability
