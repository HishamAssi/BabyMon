---

description: "Task list template for feature implementation"
---

# Tasks: Feed, Pumping & Diaper Event Details

**Input**: Design documents from `/specs/002-care-event-details/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not explicitly requested in the feature spec, so no dedicated test-writing tasks are included below (consistent with `specs/001-shared-baby-tracker/tasks.md`).

**Organization**: Tasks are grouped by user story (from spec.md, in priority order). This feature is purely additive to the existing `specs/001-shared-baby-tracker/` codebase — no new project setup is needed, so there is no separate Setup phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Existing web application layout from `specs/001-shared-baby-tracker/plan.md`: `backend/src/`, `frontend/src/`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Schema changes every user story below builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Add nullable `feedType`, `amountOz`, `diaperContents` columns to the `careEvents` table in `backend/src/db/schema.ts` (per data-model.md)
- [X] T002 Generate and apply the corresponding Drizzle migration (`npx drizzle-kit generate` in `backend/`, then run it via `backend/src/db/migrate.ts`) (depends on T001)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 2: User Story 1 - Record what and how much the baby was fed (Priority: P1) 🎯 MVP

**Goal**: A caregiver indicates breastfeed or formula when logging a feed, and can optionally record a formula amount in ounces.

**Independent Test**: Log a formula feed with an amount, a formula feed without one, and a breastfeed; confirm each displays correctly in the timeline.

### Implementation for User Story 1

- [X] T003 [US1] Accept and validate `feedType` (required for `feed`) and `amountOz` (optional; rejected when `feedType = "breastfeed"`) in `POST /babies/:babyId/events` in `backend/src/api/events.ts` (depends on T002)
- [X] T004 [US1] Accept the same fields, with the same validation, in `PATCH /babies/:babyId/events/:eventId` in `backend/src/api/events.ts` (depends on T003)
- [X] T005 [P] [US1] Add `feedType` and `amountOz` to the `CareEvent` interface in `frontend/src/data/db.ts` (depends on T002)
- [X] T006 [US1] Pass `feedType`/`amountOz` through `createLocalEvent`/`updateLocalEvent` in `frontend/src/data/careEvents.ts` (depends on T005)
- [X] T007 [US1] Map `feedType`/`amountOz` from server records in `applyCareEventRecord` in `frontend/src/data/syncClient.ts` (depends on T005)
- [X] T008 [US1] Replace the single "Feed" button with "Breastfeed" (instant log) and "Formula" (reveals an optional inline ounces field + confirm) in `frontend/src/pages/LogEvent.tsx` (depends on T006)
- [X] T009 [US1] Render feeding method and amount (when present) alongside feed entries in `frontend/src/components/EventList.tsx` (depends on T005, T007)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 3: User Story 2 - Describe a diaper change (Priority: P2)

**Goal**: A caregiver classifies a diaper change as pee, poop, or both, and can optionally add a free-form note.

**Independent Test**: Log a diaper change as pee-only, poop-only, and both, with and without a note (added via edit); confirm each displays correctly in the timeline.

### Implementation for User Story 2

- [X] T010 [US2] Accept and validate `diaperContents` (required for `diaper`) in `POST /babies/:babyId/events` in `backend/src/api/events.ts` (depends on T002)
- [X] T011 [US2] Accept `diaperContents` in `PATCH /babies/:babyId/events/:eventId` in `backend/src/api/events.ts` (depends on T010)
- [X] T012 [P] [US2] Add `diaperContents` to the `CareEvent` interface in `frontend/src/data/db.ts` (depends on T002)
- [X] T013 [US2] Pass `diaperContents` through `createLocalEvent`/`updateLocalEvent` in `frontend/src/data/careEvents.ts` (depends on T012)
- [X] T014 [US2] Map `diaperContents` from server records in `applyCareEventRecord` in `frontend/src/data/syncClient.ts` (depends on T012)
- [X] T015 [US2] Replace the single "Diaper" button with "Pee" / "Poop" / "Both" buttons, each logging instantly, in `frontend/src/pages/LogEvent.tsx` (depends on T013)
- [X] T016 [US2] Render diaper classification and the existing `notes` field (as the description) alongside diaper entries in `frontend/src/components/EventList.tsx` (depends on T012, T014)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 4: User Story 3 - Record how much was pumped (Priority: P3)

**Goal**: A caregiver can optionally record how many ounces were pumped when logging a pumping session.

**Independent Test**: Log a pumping session with an amount and one without; confirm both display correctly in the timeline.

### Implementation for User Story 3

- [X] T017 [US3] Accept `amountOz` for `type = "pumping"` in `POST`/`PATCH /babies/:babyId/events(/:eventId)` in `backend/src/api/events.ts` (depends on T002; the field itself was added in T001, this task is the pumping-specific acceptance path alongside US1's feed path)
- [X] T018 [US3] Add the same optional-inline-amount-then-confirm pattern used for Formula (T008) to the "Pumping" button in `frontend/src/pages/LogEvent.tsx` (depends on T008, T005)
- [X] T019 [US3] Render pumped amount (when present) alongside pumping entries in `frontend/src/components/EventList.tsx` (depends on T005, T007)

**Checkpoint**: All three user stories independently functional

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T020 [P] Add `aria-label`s to the new Breastfeed/Formula/Pee/Poop/Both buttons in `frontend/src/pages/LogEvent.tsx`, consistent with the existing accessibility pass (`specs/001-shared-baby-tracker/tasks.md` T050)
- [X] T021 Run `specs/002-care-event-details/quickstart.md` validation end-to-end, including the two-caregiver sync check (step 8)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **User Stories (Phase 2-4)**: All depend on Foundational. US1, US2, and US3 touch the same two files (`backend/src/api/events.ts`, `frontend/src/pages/LogEvent.tsx`, `frontend/src/components/EventList.tsx`) for different event types, so while each story is independently testable, working them fully in parallel across multiple people risks edit conflicts in those shared files — sequential (P1 → P2 → P3) is recommended for a single implementer.
- **Polish (Phase 5)**: Depends on all three user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2/US3.
- **User Story 2 (P2)**: Can start after Foundational — no dependency on US1/US3.
- **User Story 3 (P3)**: Can start after Foundational; reuses the inline-optional-amount UI pattern introduced by US1 (T008) rather than building it twice (T018 depends on T008).

### Parallel Opportunities

- T005 and T012 (frontend type additions) can run in parallel with each other and with the backend tasks in the same story, since they touch a different file with no functional dependency on the backend being done first.
- T020 (accessibility) can run in parallel with T021 (manual validation).

---

## Parallel Example: User Story 1

```bash
# Backend validation and frontend type addition can proceed in parallel:
Task: "Accept and validate feedType/amountOz in POST /babies/:babyId/events in backend/src/api/events.ts"
Task: "Add feedType and amountOz to the CareEvent interface in frontend/src/data/db.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (schema + migration)
2. Complete Phase 2: User Story 1 (feed method + amount)
3. **STOP and VALIDATE**: Run quickstart.md steps 1-4
4. Deploy/demo if ready — this alone delivers the most-requested and most-detailed part of the feature

### Incremental Delivery

1. Foundational → Foundation ready
2. US1 (Feed) → Test independently → Deploy/Demo
3. US2 (Diaper) → Test independently → Deploy/Demo
4. US3 (Pumping) → Test independently → Deploy/Demo
5. Polish → Final pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No dedicated test-writing tasks (not explicitly requested in spec.md)
- This feature deliberately shares implementation patterns across stories (e.g., US3's inline-amount UI reuses US1's) rather than introducing new ones — see research.md
